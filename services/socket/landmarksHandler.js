const { analyzeExpression } = require('../gemini/gemini');
const InterventionGenerator = require('../cbt/InterventionGenerator');
const errorHandler = require('../ErrorHandler');

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
  const analysisInterval = setInterval(async () => {
    // 세션이 활성 상태가 아니면 분석 건너뛰기
    if (session.status !== 'active') {
      console.log(`⏸️ 세션 비활성 상태, 분석 건너뛰기: ${session.status}`);
      return;
    }

    // 버퍼에 데이터가 없으면 건너뛰기
    if (session.landmarkBuffer.length === 0) {
      console.log(`📭 Landmarks 버퍼 비어있음, 분석 건너뛰기`);
      return;
    }

    try {
      // 분석용 데이터 복사
      const frames = [...session.landmarkBuffer];
      const sttText = session.sttBuffer.join(' ');

      // 버퍼 초기화 (다음 주기를 위해)
      session.landmarkBuffer = [];
      session.sttBuffer = [];

      console.log(`📊 10초 주기 분석 시작 (frames: ${frames.length}, stt_len: ${sttText.length})`);

      // Gemini 감정 분석
      const emotion = await analyzeExpression(frames, sttText);
      console.log(`🎯 Gemini 분석 결과: ${emotion}`);

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

      // 클라이언트에게 결과 전송
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

        ws.send(JSON.stringify(responseData));
        console.log(`📤 감정 업데이트 전송: ${emotion}`);
      }

    } catch (error) {
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
        // 랜드마크 데이터를 세션 버퍼에 추가
        session.landmarkBuffer.push({
          timestamp: Date.now(),
          landmarks: message.data
        });

        frameCount++;

        // 디버깅: 100프레임마다 로그
        if (frameCount % 100 === 0) {
          console.log(`📦 Landmarks 프레임 수신: ${frameCount}개 (버퍼: ${session.landmarkBuffer.length})`);
        }
      }

    } catch (error) {
      console.error('❌ Landmarks 메시지 파싱 오류:', error);
    }
  });

  // 연결 종료
  ws.on('close', () => {
    console.log(`🔌 Landmarks 채널 종료: ${session.sessionId}`);
    clearInterval(analysisInterval);
    session.wsConnections.landmarks = null;
  });

  // 에러 처리
  ws.on('error', (error) => {
    console.error(`❌ Landmarks WebSocket 오류 (${session.sessionId}):`, error);
    clearInterval(analysisInterval);
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
