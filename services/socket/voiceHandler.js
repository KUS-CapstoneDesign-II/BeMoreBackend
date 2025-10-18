/**
 * Voice WebSocket 핸들러
 * - 음성 오디오 청크 수신
 * - VAD (Voice Activity Detection) 데이터 저장
 * - Phase 2에서 Silero VAD 통합 예정
 *
 * @param {WebSocket} ws - WebSocket 연결
 * @param {Object} session - 세션 객체
 */
function handleVoice(ws, session) {
  let audioChunkCount = 0;

  console.log(`🎤 Voice 핸들러 시작: ${session.sessionId}`);

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
        // Phase 2: VAD 분석 결과 수신 (프론트엔드에서 전송)
        session.vadBuffer.push({
          timestamp: Date.now(),
          isSpeech: message.data.isSpeech,
          probability: message.data.probability
        });

        console.log(`📊 VAD 결과: isSpeech=${message.data.isSpeech}, prob=${message.data.probability}`);
      }

    } catch (error) {
      console.error('❌ Voice 메시지 파싱 오류:', error);
    }
  });

  // 연결 종료
  ws.on('close', () => {
    console.log(`🔌 Voice 채널 종료: ${session.sessionId}`);
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
