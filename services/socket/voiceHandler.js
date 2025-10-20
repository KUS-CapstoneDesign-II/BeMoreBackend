const VadMetrics = require('../vad/VadMetrics');
const PsychologicalIndicators = require('../vad/PsychologicalIndicators');

/**
 * Voice WebSocket 핸들러
 * - 음성 오디오 청크 수신
 * - VAD (Voice Activity Detection) 실시간 분석
 * - 7가지 VAD 메트릭 계산
 * - 5가지 심리 지표 추출
 *
 * Phase 2 핵심 기능:
 * - Silero VAD 기반 음성/침묵 구분
 * - 10초 주기 메트릭 계산 및 전송
 * - 실시간 심리 위험도 모니터링
 *
 * @param {WebSocket} ws - WebSocket 연결
 * @param {Object} session - 세션 객체
 */
function handleVoice(ws, session) {
  let audioChunkCount = 0;

  // VAD 메트릭 및 심리 지표 분석기 초기화
  const vadMetrics = new VadMetrics();
  const psychIndicators = new PsychologicalIndicators();

  // 세션에 VAD 관련 객체 추가
  session.vadMetrics = vadMetrics;
  session.psychIndicators = psychIndicators;

  console.log(`🎤 Voice 핸들러 시작: ${session.sessionId}`);

  // 10초 주기 VAD 분석 및 심리 지표 계산
  const VAD_ANALYSIS_INTERVAL = 10 * 1000; // 10초

  const vadAnalysisInterval = setInterval(() => {
    if (session.status !== 'active') return;

    // VAD 메트릭 계산
    const metrics = vadMetrics.calculate();

    // 심리 지표 분석
    const psychological = psychIndicators.analyze(metrics);

    // 결과 저장
    session.vadAnalysisHistory = session.vadAnalysisHistory || [];
    session.vadAnalysisHistory.push({
      timestamp: Date.now(),
      metrics,
      psychological
    });

    console.log(`🧠 VAD 분석 완료: 위험도 ${psychological.riskScore}/100 (${psychological.riskLevel})`);

    // 위험도가 높으면 알림
    if (psychological.riskLevel === 'critical' || psychological.riskLevel === 'high') {
      console.warn(`⚠️ 높은 심리 위험도 감지: ${psychological.riskScore}/100`);
      psychological.alerts.forEach(alert => {
        console.warn(`   - ${alert.type}: ${alert.message}`);
      });
    }

    // WebSocket으로 실시간 VAD 분석 결과 전송
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'vad_analysis',
        data: {
          timestamp: Date.now(),
          metrics,
          psychological,
          timeSeries: vadMetrics.getTimeSeries(10000) // 10초 단위
        }
      }));
    }
  }, VAD_ANALYSIS_INTERVAL);

  // 메시지 수신: 오디오 청크 또는 STT 텍스트
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'audio_chunk') {
        // Phase 2: VAD 분석을 위한 오디오 청크 저장
        session.vadBuffer.push({
          timestamp: Date.now(),
          audioData: message.data
        });

        audioChunkCount++;

        // 디버깅: 10청크마다 로그
        if (audioChunkCount % 10 === 0) {
          console.log(`🎵 오디오 청크 수신: ${audioChunkCount}개 (버퍼: ${session.vadBuffer.length})`);
        }

      } else if (message.type === 'stt_text') {
        // STT 변환된 텍스트 수신
        const text = message.data.text;

        if (text && text.trim().length > 0) {
          session.sttBuffer.push(text);
          console.log(`💬 STT 텍스트 수신: "${text.slice(0, 50)}..."`);

          // STT 확인 메시지 전송
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: 'stt_received',
              data: {
                timestamp: Date.now(),
                textLength: text.length
              }
            }));
          }
        }

      } else if (message.type === 'vad_result') {
        // Phase 2: VAD 분석 결과 수신 및 메트릭 계산
        const vadResult = {
          timestamp: message.data.timestamp || Date.now(),
          isSpeech: message.data.isSpeech,
          duration: message.data.duration || 0,
          energy: message.data.energy || 0
        };

        // vadBuffer에 저장
        session.vadBuffer.push(vadResult);

        // VadMetrics에 이벤트 추가
        vadMetrics.addEvent(vadResult);

        // ✅ 실시간 VAD 결과를 프론트로 전송 (STT 조건부 실행용)
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: 'vad_realtime',
            data: {
              isSpeech: vadResult.isSpeech,
              probability: vadResult.isSpeech ? 0.8 : 0.2, // 간단한 확률값
              energy: vadResult.energy,
              timestamp: vadResult.timestamp
            }
          }));
        }

        // 로깅 (10개마다)
        if (session.vadBuffer.length % 10 === 0) {
          const { summary } = vadMetrics.getSummary();
          console.log(`📊 VAD 메트릭: ${summary}`);
        }
      }

    } catch (error) {
      console.error('❌ Voice 메시지 파싱 오류:', error);
    }
  });

  // 연결 종료
  ws.on('close', () => {
    console.log(`🔌 Voice 채널 종료: ${session.sessionId}`);

    // VAD 분석 인터벌 정리
    clearInterval(vadAnalysisInterval);

    session.wsConnections.voice = null;
  });

  // 에러 처리
  ws.on('error', (error) => {
    console.error(`❌ Voice WebSocket 오류 (${session.sessionId}):`, error);
    session.wsConnections.voice = null;
  });

  // 초기 연결 확인 메시지
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      channel: 'voice',
      sessionId: session.sessionId,
      message: 'Voice 채널 연결 성공',
      features: {
        audioChunk: true,
        sttText: true,
        vadResult: true  // Phase 2
      }
    }
  }));
}

module.exports = { handleVoice };
