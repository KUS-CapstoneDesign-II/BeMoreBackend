const WebSocket = require('ws');

console.log('🧪 WebSocket 3채널 연결 테스트 시작\n');

// 1. 세션 생성
async function createSession() {
  const response = await fetch('http://localhost:8000/api/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'test_ws_user',
      counselorId: 'test_ws_counselor'
    })
  });

  const result = await response.json();
  return result.data;
}

async function testWebSockets() {
  try {
    // 세션 생성
    const session = await createSession();
    console.log(`✅ 세션 생성: ${session.sessionId}\n`);

    // WebSocket URLs
    const wsUrls = session.wsUrls;

    // 1. Landmarks 채널 테스트
    console.log('📡 Landmarks 채널 연결 중...');
    const landmarksWs = new WebSocket(wsUrls.landmarks);

    landmarksWs.on('open', () => {
      console.log('✅ Landmarks 채널 연결 성공');
    });

    landmarksWs.on('message', (data) => {
      const message = JSON.parse(data);
      console.log(`📥 Landmarks 메시지: ${message.type}`);
    });

    // 2. Voice 채널 테스트
    console.log('📡 Voice 채널 연결 중...');
    const voiceWs = new WebSocket(wsUrls.voice);

    voiceWs.on('open', () => {
      console.log('✅ Voice 채널 연결 성공');
    });

    voiceWs.on('message', (data) => {
      const message = JSON.parse(data);
      console.log(`📥 Voice 메시지: ${message.type}`);
    });

    // 3. Session 채널 테스트
    console.log('📡 Session 채널 연결 중...');
    const sessionWs = new WebSocket(wsUrls.session);

    sessionWs.on('open', () => {
      console.log('✅ Session 채널 연결 성공\n');

      // 연결 후 테스트 메시지 전송
      setTimeout(() => {
        console.log('📤 테스트 메시지 전송 시작\n');

        // Landmarks 테스트 데이터 전송
        console.log('📤 Landmarks 데이터 전송 (68개 랜드마크)');
        const testLandmarks = {
          type: 'landmarks',
          data: {
            eyes: Array(20).fill({ x: 0.5, y: 0.5, z: 0.1 }),
            eyebrows: Array(10).fill({ x: 0.5, y: 0.3, z: 0.05 }),
            mouth: Array(20).fill({ x: 0.5, y: 0.7, z: 0.08 }),
            nose: Array(8).fill({ x: 0.5, y: 0.5, z: 0.15 }),
            contour: Array(10).fill({ x: 0.5, y: 0.5, z: 0.02 })
          }
        };
        landmarksWs.send(JSON.stringify(testLandmarks));

        // Voice STT 테스트 데이터 전송
        console.log('📤 Voice STT 데이터 전송');
        const testSTT = {
          type: 'stt_text',
          data: { text: '이것은 테스트 음성 텍스트입니다.' }
        };
        voiceWs.send(JSON.stringify(testSTT));

        // Session 제어 테스트
        setTimeout(() => {
          console.log('\n📤 Session 일시정지 명령');
          sessionWs.send(JSON.stringify({ type: 'pause' }));

          setTimeout(() => {
            console.log('📤 Session 재개 명령');
            sessionWs.send(JSON.stringify({ type: 'resume' }));

            setTimeout(() => {
              console.log('📤 Session 상태 조회');
              sessionWs.send(JSON.stringify({ type: 'get_status' }));

              setTimeout(() => {
                console.log('\n✅ 모든 WebSocket 테스트 완료!');
                landmarksWs.close();
                voiceWs.close();
                sessionWs.close();
                process.exit(0);
              }, 1000);
            }, 1000);
          }, 1000);
        }, 1000);
      }, 1000);
    });

    sessionWs.on('message', (data) => {
      const message = JSON.parse(data);
      console.log(`📥 Session 메시지: ${message.type}`);
      if (message.type === 'status_update') {
        console.log(`   - 상태: ${message.data.status}`);
        console.log(`   - 감정 수: ${message.data.emotionCount}`);
      }
    });

    // 에러 처리
    [landmarksWs, voiceWs, sessionWs].forEach((ws, index) => {
      const names = ['Landmarks', 'Voice', 'Session'];
      ws.on('error', (error) => {
        console.error(`❌ ${names[index]} 에러:`, error.message);
      });
      ws.on('close', () => {
        console.log(`🔌 ${names[index]} 채널 종료`);
      });
    });

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  }
}

testWebSockets();
