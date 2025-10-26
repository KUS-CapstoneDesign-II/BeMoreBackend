const { analyzeExpression, generateDetailedReport  } = require('../gemini/gemini');
const InterventionGenerator = require('../cbt/InterventionGenerator');
const errorHandler = require('../ErrorHandler');
const EmotionAnalyzer = require('../emotion/EmotionAnalyzer');

const fs = require('fs');
const path = require('path');
const { getAccumulatedSpeechText, clearSpeechBuffer, clearAllSpeechBuffer } = require("../memory");



// 10초 분석 주기 (기존 60초에서 단축)
const ANALYSIS_INTERVAL_MS = 10 * 1000;

/**
 * Landmarks WebSocket 핸들러
 * - 얼굴 표정 데이터 수신
 * - 10초마다 Gemini 감정 분석 실행
 * - Phase 3: CBT 인지 왜곡 탐지 및 개입
 * - 세션 버퍼에 데이터 누적
 *
 * @param {WebSocket} ws - WebSocket 연결
 * @param {Object} session - 세션 객체
 */
function handleLandmarks(ws, session) {
  let frameCount = 0;

  // CBT 개입 생성기 초기화
  const interventionGenerator = new InterventionGenerator();
  session.interventionGenerator = interventionGenerator;

  console.log(`🎭 Landmarks 핸들러 시작: ${session.sessionId}`);

  // 10초마다 감정 분석 실행
  let analysisCycleCount = 0;
  const analysisInterval = setInterval(async () => {
    analysisCycleCount++;

    // ⏱️ Post-session grace period: continue analysis for 15 seconds after session ends
    // This allows final Gemini responses (8-13s latency) to be saved to database
    const hasPendingFrames = session.landmarkBuffer.length > 0;
    const isPostSessionWindow =
      session.status === 'ended' &&
      session.endedAt &&
      Date.now() - session.endedAt < 15000; // 15 seconds grace period

    // 세션이 활성 상태가 아니면 분석 건너뛰기 (단, post-session 기간은 제외)
    if (session.status !== 'active' && !isPostSessionWindow) {
      if (analysisCycleCount % 6 === 0) {  // 60초마다 한 번씩만 로그
        console.log(`⏸️ [분석 사이클 #${analysisCycleCount}] 세션 비활성 상태, 분석 건너뛰기: ${session.status}`);
      }
      // ✅ 15초 grace period가 끝났으면 분석 종료
      if (session.status === 'ended' && !isPostSessionWindow) {
        console.log(`✅ [분석 사이클 #${analysisCycleCount}] 세션 post-session grace period 완료, 분석 종료`);
        clearInterval(analysisInterval);
      }
      return;
    }

    // 버퍼에 데이터가 없으면 건너뛰기
    if (!hasPendingFrames && !isPostSessionWindow) {
      if (analysisCycleCount % 3 === 0) {  // 30초마다 한 번씩만 로그
        console.log(`📭 [분석 사이클 #${analysisCycleCount}] Landmarks 버퍼 비어있음, 분석 건너뛰기`);
      }
      return;
    }

    // Post-session logging
    if (isPostSessionWindow && hasPendingFrames) {
      const timeSinceEnd = Math.round((Date.now() - session.endedAt) / 1000);
      console.log(`⏳ [분석 사이클 #${analysisCycleCount}] POST-SESSION GRACE PERIOD (${timeSinceEnd}s after end) - 버퍼: ${session.landmarkBuffer.length}개`);
    }

    console.log(`🔵 [분석 사이클 #${analysisCycleCount}] 분석 시작 - 버퍼: ${session.landmarkBuffer.length}개 프레임`);

    try {
      // 분석용 데이터 복사
      const frames = [...session.landmarkBuffer];
      const sttText = session.sttBuffer.join(' ');

      // 버퍼 초기화 (다음 주기를 위해)
      session.landmarkBuffer = [];
      session.sttBuffer = [];

      console.log(`📊 10초 주기 분석 시작 (frames: ${frames.length}, stt_len: ${sttText.length})`);

      // 🔴 CRITICAL: Gemini 감정 분석 실행 확인
      console.log(`🔍 [CRITICAL] emotion_analysis starting with ${frames.length} frames`);

      // Gemini 감정 분석
      const emotion = await analyzeExpression(frames, sttText);
      console.log(`🎯 Gemini 분석 결과: ${emotion}`);
      console.log(`✅ [CRITICAL] Emotion parsed: ${emotion}`);

      // 상세 감정 리포트 생성 => 만약 필요 하다면 
      // const detailedReport = await generateDetailedReport(frames, sttText);
      // console.log(`📑 상세 리포트 생성 완료`);

      // Phase 3: CBT 인지 왜곡 탐지 및 개입
      let cbtAnalysis = null;
      if (sttText.length > 0) {
        const context = {
          emotion,
          frameCount: frames.length,
          timestamp: Date.now()
        };

        cbtAnalysis = await interventionGenerator.analyze(sttText, context);

        if (cbtAnalysis.hasDistortions) {
          console.log(`🔍 인지 왜곡 탐지: ${cbtAnalysis.detections.length}개`);
          cbtAnalysis.detections.forEach(d => {
            console.log(`   - ${d.name_ko} (${d.severity}, 신뢰도: ${d.confidence})`);
          });

          if (cbtAnalysis.needsIntervention && cbtAnalysis.intervention) {
            console.log(`🎯 치료적 개입: ${cbtAnalysis.intervention.distortionName}`);
            console.log(`   - 질문: ${cbtAnalysis.intervention.questions.length}개`);
            console.log(`   - 과제: ${cbtAnalysis.intervention.tasks.length}개`);
          }
        }
      }

      // 감정 결과 저장
      const emotionData = {
        timestamp: Date.now(),
        emotion,
        frameCount: frames.length,
        sttLength: sttText.length,
        cbtAnalysis: cbtAnalysis  // CBT 분석 결과 포함
      };
      session.emotions.push(emotionData);

      // ✅ Phase 5: CBT 분석 결과를 세션에 저장 (AI 응답 컨텍스트용)
      if (cbtAnalysis) {
        session.lastCBTAnalysis = cbtAnalysis;
      }

      // 클라이언트에게 결과 전송
      console.log(`🔴 [CRITICAL] WebSocket readyState: ${ws.readyState} (1=OPEN)`);

      // 🔥 WebSocket으로 emotion_update 전송 시도
      if (ws.readyState === 1) {  // 1 = OPEN
        const responseData = {
          type: 'emotion_update',
          data: {
            emotion,
            timestamp: emotionData.timestamp,
            frameCount: frames.length,
            sttSnippet: sttText.slice(0, 100)
          }
        };

        // CBT 개입이 있으면 포함
        if (cbtAnalysis && cbtAnalysis.needsIntervention && cbtAnalysis.intervention) {
          responseData.data.intervention = {
            distortionType: cbtAnalysis.intervention.distortionType,
            distortionName: cbtAnalysis.intervention.distortionName,
            severity: cbtAnalysis.intervention.severity,
            urgency: cbtAnalysis.intervention.urgency,
            questions: cbtAnalysis.intervention.questions,
            tasks: cbtAnalysis.intervention.tasks.map(t => ({
              title: t.title,
              description: t.description,
              difficulty: t.difficulty,
              duration: t.duration
            }))
          };
        }

        console.log(`📤 [CRITICAL] About to send emotion_update:`, JSON.stringify(responseData).substring(0, 200));

        ws.send(JSON.stringify(responseData));
        console.log(`✅ [CRITICAL] emotion_update sent successfully: ${emotion}`);
      } else {
        console.error(`❌ [CRITICAL] WebSocket NOT OPEN (readyState=${ws.readyState}) - cannot send emotion_update!`);
      }

      // ✅ Sequelize 데이터베이스로 감정 데이터 저장 (fire-and-forget)
      // WebSocket이 닫혀있어도 emotion 데이터는 로컬 DB에 보존됨
      setImmediate(async () => {
        try {
          console.log(`💾 [CRITICAL] Attempting to save emotion to database...`);

          const db = require('../../models');
          const { Session } = db;

          // 1️⃣ 기존 세션 데이터 가져오기
          const existingSession = await Session.findOne({
            where: { sessionId: session.sessionId }
          });

          if (!existingSession) {
            console.error(`❌ [CRITICAL] Session not found in database: ${session.sessionId}`);
            return;
          }

          // 2️⃣ 기존 감정 데이터 + 새 감정 데이터
          const emotions = existingSession.emotionsData || [];
          emotions.push(emotionData);

          // 3️⃣ 데이터베이스에 업데이트
          await existingSession.update({
            emotionsData: emotions
          });

          console.log(`✅ [CRITICAL] Emotion saved to database: ${emotion}`);
          console.log(`✅ [CRITICAL] Total emotions for session: ${emotions.length}`);

        } catch (dbError) {
          console.error(`❌ [CRITICAL] Failed to save emotion to database:`);
          console.error(`   Error: ${dbError.message}`);
          console.error(`   Stack: ${dbError.stack}`);
        }
      });

    } catch (error) {
      console.error(`❌ [CRITICAL] Analysis error caught:`, {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500)
      });

      errorHandler.handle(error, {
        module: 'landmarks-analysis',
        level: errorHandler.levels.ERROR,
        sessionId: session.sessionId,
        metadata: {
          frameCount: session.landmarkBuffer.length,
          sttBufferLength: session.sttBuffer.length
        }
      });

      // 에러를 클라이언트에 전송
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'error',
          data: {
            code: 'ANALYSIS_ERROR',
            message: '감정 분석 중 오류가 발생했습니다',
            timestamp: Date.now()
          }
        }));
      }
    }
  }, ANALYSIS_INTERVAL_MS);

  // 메시지 수신: 얼굴 랜드마크 데이터
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'landmarks') {
        // ✅ 첫 프레임 데이터 검증 로그
        if (frameCount === 0) {
          const landmark = Array.isArray(message.data) ? message.data[0] : null;
          console.log(`📊 첫 번째 랜드마크 수신 데이터 검증:`, {
            isArray: Array.isArray(message.data),
            length: Array.isArray(message.data) ? message.data.length : 'not-array',
            firstPointType: landmark ? typeof landmark : 'no-data',
            firstPointHasY: landmark ? ('y' in landmark) : false,
            firstPointYType: landmark?.y ? typeof landmark.y : 'no-y'
          });
        }

        // ✅ 랜드마크 데이터를 세션 버퍼에 추가
        // message.data = [{x,y,z}, {x,y,z}, ...468개]
        // 분석 함수는 frame.landmarks[0]이 {x,y,z}를 기대함
        session.landmarkBuffer.push({
          timestamp: Date.now(),
          landmarks: message.data  // 배열 유지
        });

        frameCount++;

        // ✅ 디버깅: 10프레임마다 로그 (더 자주 확인)
        if (frameCount % 10 === 0) {
          console.log(`📨 Landmarks 수신 중... (누적: ${frameCount}개, 버퍼: ${session.landmarkBuffer.length})`);
        }

        // 100프레임마다도 상세 로그
        if (frameCount % 100 === 0) {
          console.log(`📦 Landmarks 프레임 수신: ${frameCount}개 (버퍼: ${session.landmarkBuffer.length})`);
        }
      }

    } catch (error) {
      console.error('❌ Landmarks 메시지 파싱 실패:', error.message);
      errorHandler.handle(error, {
        module: 'landmarks-handler',
        level: errorHandler.levels.ERROR,
        metadata: { sessionId: session.sessionId, messageType: 'parse_error', dataLength: data?.length }
      });
    }
  });

  // 연결 종료
  ws.on('close', () => {
    console.log(`🔌 Landmarks 채널 종료: ${session.sessionId}`);
    // ✅ Do NOT clear analysisInterval here - let it continue for the 15-second grace period
    // so that pending Gemini analysis can complete and be saved to the database
    session.wsConnections.landmarks = null;
  });

  // 에러 처리
  ws.on('error', (error) => {
    errorHandler.handle(error, {
      module: 'landmarks-handler',
      level: errorHandler.levels.ERROR,
      metadata: { sessionId: session.sessionId, event: 'websocket_error' }
    });
    // ✅ Do NOT clear analysisInterval here either - let the grace period complete
    session.wsConnections.landmarks = null;
  });

  // 초기 연결 확인 메시지
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      channel: 'landmarks',
      sessionId: session.sessionId,
      analysisInterval: ANALYSIS_INTERVAL_MS,
      message: 'Landmarks 채널 연결 성공'
    }
  }));
}

module.exports = { handleLandmarks };
