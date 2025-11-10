const SessionManager = require('../session/SessionManager');
const Conversation = require('../../models/Conversation');
const { streamCounselingResponse } = require('../gemini/gemini');

/**
 * Session WebSocket 핸들러
 * - 세션 제어 명령 수신 (pause/resume/end)
 * - 세션 상태 변경 알림 전송
 * - 실시간 세션 모니터링
 *
 * @param {WebSocket} ws - WebSocket 연결
 * @param {Object} session - 세션 객체
 */
function handleSession(ws, session) {
  console.log(`⚙️ Session 핸들러 시작: ${session.sessionId}`);

  // 메시지 수신: 세션 제어 명령
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'pause':
          handlePauseCommand(ws, session);
          break;

        case 'resume':
          handleResumeCommand(ws, session);
          break;

        case 'end':
          handleEndCommand(ws, session);
          break;

        case 'ping':
          // 연결 상태 확인
          ws.send(JSON.stringify({
            type: 'pong',
            data: {
              timestamp: Date.now(),
              sessionId: session.sessionId,
              status: session.status
            }
          }));
          break;

        case 'get_status':
          // 세션 상태 조회
          sendStatusUpdate(ws, session);
          break;

        case 'request_ai_response':
          // AI 상담 응답 요청
          handleAIResponseRequest(ws, session, message.data);
          break;

        default:
          console.warn(`⚠️ 알 수 없는 세션 명령: ${message.type}`);
          ws.send(JSON.stringify({
            type: 'error',
            data: {
              code: 'UNKNOWN_COMMAND',
              message: `알 수 없는 명령: ${message.type}`
            }
          }));
      }

    } catch (error) {
      console.error('❌ Session 메시지 파싱 오류:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: {
          code: 'PARSE_ERROR',
          message: '메시지 파싱 오류'
        }
      }));
    }
  });

  // 연결 종료
  ws.on('close', () => {
    console.log(`🔌 Session 채널 종료: ${session.sessionId}`);
    session.wsConnections.session = null;
  });

  // 에러 처리
  ws.on('error', (error) => {
    console.error(`❌ Session WebSocket 오류 (${session.sessionId}):`, error);
    session.wsConnections.session = null;
  });

  // 초기 연결 확인 메시지
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      channel: 'session',
      sessionId: session.sessionId,
      status: session.status,
      message: 'Session 채널 연결 성공',
      commands: ['pause', 'resume', 'end', 'ping', 'get_status', 'request_ai_response']
    }
  }));

  // 초기 상태 전송
  sendStatusUpdate(ws, session);
}

/**
 * 일시정지 명령 처리
 */
function handlePauseCommand(ws, session) {
  try {
    SessionManager.pauseSession(session.sessionId);

    console.log(`⏸️ 세션 일시정지 명령: ${session.sessionId}`);

    ws.send(JSON.stringify({
      type: 'pause_success',
      data: {
        sessionId: session.sessionId,
        status: session.status,
        pausedAt: session.pausedAt,
        message: '세션이 일시정지되었습니다'
      }
    }));

    // 다른 채널에도 일시정지 알림
    notifyOtherChannels(session, {
      type: 'session_paused',
      data: {
        timestamp: session.pausedAt
      }
    });

  } catch (error) {
    console.error('❌ 일시정지 명령 오류:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: {
        code: 'PAUSE_ERROR',
        message: error.message
      }
    }));
  }
}

/**
 * 재개 명령 처리
 */
function handleResumeCommand(ws, session) {
  try {
    SessionManager.resumeSession(session.sessionId);

    console.log(`▶️ 세션 재개 명령: ${session.sessionId}`);

    ws.send(JSON.stringify({
      type: 'resume_success',
      data: {
        sessionId: session.sessionId,
        status: session.status,
        resumedAt: session.resumedAt,
        message: '세션이 재개되었습니다'
      }
    }));

    // 다른 채널에도 재개 알림
    notifyOtherChannels(session, {
      type: 'session_resumed',
      data: {
        timestamp: session.resumedAt
      }
    });

  } catch (error) {
    console.error('❌ 재개 명령 오류:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: {
        code: 'RESUME_ERROR',
        message: error.message
      }
    }));
  }
}

/**
 * 종료 명령 처리
 */
function handleEndCommand(ws, session) {
  try {
    const duration = SessionManager.getSessionDuration(session.sessionId);

    console.log(`✅ 세션 종료 명령: ${session.sessionId}`);

    // 다른 채널에 종료 알림 먼저 전송
    notifyOtherChannels(session, {
      type: 'session_ended',
      data: {
        timestamp: Date.now(),
        duration
      }
    });

    // 세션 종료 (WebSocket 연결도 모두 닫힘)
    SessionManager.endSession(session.sessionId);

    // 종료 성공 메시지
    ws.send(JSON.stringify({
      type: 'end_success',
      data: {
        sessionId: session.sessionId,
        status: session.status,
        endedAt: session.endedAt,
        duration,
        emotionCount: session.emotions.length,
        message: '세션이 종료되었습니다'
      }
    }));

  } catch (error) {
    console.error('❌ 종료 명령 오류:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: {
        code: 'END_ERROR',
        message: error.message
      }
    }));
  }
}

/**
 * 세션 상태 업데이트 전송
 */
function sendStatusUpdate(ws, session) {
  if (ws.readyState !== 1) return;  // 1 = OPEN

  ws.send(JSON.stringify({
    type: 'status_update',
    data: {
      sessionId: session.sessionId,
      status: session.status,
      startedAt: session.startedAt,
      pausedAt: session.pausedAt,
      resumedAt: session.resumedAt,
      endedAt: session.endedAt,
      duration: SessionManager.getSessionDuration(session.sessionId),
      emotionCount: session.emotions.length,
      landmarkCount: session.landmarkBuffer.length,
      sttCount: session.sttBuffer.length,
      vadCount: session.vadBuffer.length
    }
  }));
}

/**
 * 다른 채널에 알림 전송
 */
function notifyOtherChannels(session, message) {
  // Landmarks 채널에 알림
  if (session.wsConnections.landmarks && session.wsConnections.landmarks.readyState === 1) {
    session.wsConnections.landmarks.send(JSON.stringify(message));
  }

  // Voice 채널에 알림
  if (session.wsConnections.voice && session.wsConnections.voice.readyState === 1) {
    session.wsConnections.voice.send(JSON.stringify(message));
  }
}

/**
 * AI 응답 요청 처리
 * @param {WebSocket} ws - WebSocket 연결
 * @param {Object} session - 세션 객체
 * @param {Object} data - 요청 데이터 {message: string, emotion?: string}
 */
async function handleAIResponseRequest(ws, session, data) {
  try {
    const { message: userMessage, emotion } = data || {};

    // 입력 검증
    if (!userMessage || typeof userMessage !== 'string') {
      ws.send(JSON.stringify({
        type: 'ai_stream_error',
        data: {
          code: 'INVALID_MESSAGE',
          message: '사용자 메시지가 필요합니다'
        }
      }));
      return;
    }

    console.log(`🤖 AI 응답 요청: ${session.sessionId}, emotion: ${emotion || 'neutral'}`);

    // 1. 사용자 메시지를 대화 히스토리에 저장
    const currentEmotion = emotion || 'neutral';
    await Conversation.saveMessage(session.sessionId, 'user', userMessage, currentEmotion);

    // 2. 최근 대화 히스토리 조회 (최대 10개)
    const conversationHistory = await Conversation.getHistory(session.sessionId, 10);

    // 3. 스트리밍 시작 알림
    ws.send(JSON.stringify({
      type: 'ai_stream_begin',
      data: {
        timestamp: Date.now(),
        emotion: currentEmotion
      }
    }));

    let fullResponse = '';

    // 4. Gemini 스트리밍 호출
    await streamCounselingResponse(
      conversationHistory,
      currentEmotion,
      // onChunk: 각 청크를 클라이언트에 전송
      (chunk) => {
        if (ws.readyState === 1) {  // OPEN
          fullResponse += chunk;
          ws.send(JSON.stringify({
            type: 'ai_stream_chunk',
            data: {
              chunk,
              timestamp: Date.now()
            }
          }));
        }
      },
      // onComplete: 완료 시 DB 저장 및 클라이언트 알림
      async (response) => {
        // AI 응답을 대화 히스토리에 저장
        await Conversation.saveMessage(session.sessionId, 'assistant', response);

        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: 'ai_stream_complete',
            data: {
              fullResponse: response,
              timestamp: Date.now(),
              conversationId: session.sessionId
            }
          }));
        }

        console.log(`✅ AI 응답 완료: ${session.sessionId} (${response.length} chars)`);
      },
      // onError: 에러 발생 시 클라이언트 알림
      (error) => {
        console.error(`❌ AI 스트리밍 오류: ${session.sessionId}`, error);
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: 'ai_stream_error',
            data: {
              code: 'STREAMING_ERROR',
              message: 'AI 응답 생성 중 오류가 발생했습니다',
              error: error.message
            }
          }));
        }
      }
    );

  } catch (error) {
    console.error('❌ AI 응답 요청 오류:', error);
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'ai_stream_error',
        data: {
          code: 'REQUEST_ERROR',
          message: 'AI 응답 요청 처리 중 오류가 발생했습니다',
          error: error.message
        }
      }));
    }
  }
}

module.exports = { handleSession };
