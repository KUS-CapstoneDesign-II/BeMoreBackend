const url = require('url');
const SessionManager = require('../session/SessionManager');
const { handleLandmarks } = require('./landmarksHandler');
const { handleVoice } = require('./voiceHandler');
const { handleSession } = require('./sessionHandler');

// Heartbeat and cleanup settings
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30s
const SESSION_CLEANUP_GRACE_MS = 60 * 1000; // 60s after all channels closed and session ended

/**
 * WebSocket 3채널 라우터 설정
 *
 * 채널:
 * 1. /ws/landmarks?sessionId=xxx - 얼굴 표정 데이터
 * 2. /ws/voice?sessionId=xxx - 음성 오디오 데이터
 * 3. /ws/session?sessionId=xxx - 세션 제어 (pause/resume/end)
 *
 * @param {WebSocketServer} wss - WebSocket 서버 인스턴스
 */
function setupWebSockets(wss) {
  wss.on('connection', (ws, req) => {
    const { pathname, query } = url.parse(req.url, true);
    // Accept both query parameter and path segment session id
    // e.g., /ws/landmarks?sessionId=sess_... or /ws/landmarks/sess_...
    const segments = pathname.split('/').filter(Boolean);
    const pathSessionId = segments.length >= 3 ? segments[2] : undefined;
    const sessionId = query.sessionId || pathSessionId;

    console.log(`🔌 WebSocket 연결 시도: ${pathname}, sessionId: ${sessionId}`);

    // sessionId 검증
    if (!sessionId) {
      console.warn('⚠️ sessionId 누락');
      ws.close(1008, 'sessionId required in query parameter');
      return;
    }

    // 세션 존재 여부 확인
    const session = SessionManager.getSession(sessionId);
    if (!session) {
      console.warn(`⚠️ 유효하지 않은 sessionId: ${sessionId}`);
      ws.close(1008, `Invalid sessionId: ${sessionId}`);
      return;
    }

    // 경로별 핸들러 라우팅
    // Normalize base path without trailing session segment
    const basePath = segments.length >= 2 ? `/${segments[0]}/${segments[1]}` : pathname;

    // Attach heartbeat (ping/pong)
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const heartbeat = setInterval(() => {
      if (ws.readyState !== 1) return; // OPEN
      if (ws.isAlive === false) {
        console.warn(`⚠️ WebSocket heartbeat timeout: ${pathname} (${sessionId})`);
        clearInterval(heartbeat);
        return ws.terminate();
      }
      ws.isAlive = false;
      try { ws.ping(); } catch (_) {}
    }, HEARTBEAT_INTERVAL_MS);

    // Session cleanup helper
    const scheduleCleanupIfEligible = () => {
      const s = SessionManager.getSession(sessionId);
      if (!s) return;
      const allClosed = !s.wsConnections.landmarks && !s.wsConnections.voice && !s.wsConnections.session;
      if (s.status === 'ended' && allClosed) {
        setTimeout(() => {
          const s2 = SessionManager.getSession(sessionId);
          if (!s2) return;
          const allClosed2 = !s2.wsConnections.landmarks && !s2.wsConnections.voice && !s2.wsConnections.session;
          if (s2.status === 'ended' && allClosed2) {
            SessionManager.deleteSession(sessionId);
          }
        }, SESSION_CLEANUP_GRACE_MS);
      }
    };

    ws.on('close', () => {
      clearInterval(heartbeat);
      scheduleCleanupIfEligible();
    });
    ws.on('error', () => {
      clearInterval(heartbeat);
      scheduleCleanupIfEligible();
    });

    switch (basePath) {
      case '/ws/landmarks':
        console.log(`✅ Landmarks 채널 연결: ${sessionId}`);
        session.wsConnections.landmarks = ws;
        handleLandmarks(ws, session);
        break;

      case '/ws/voice':
        console.log(`✅ Voice 채널 연결: ${sessionId}`);
        session.wsConnections.voice = ws;
        handleVoice(ws, session);
        break;

      case '/ws/session':
        console.log(`✅ Session 채널 연결: ${sessionId}`);
        session.wsConnections.session = ws;
        handleSession(ws, session);
        break;

      default:
        console.warn(`⚠️ 알 수 없는 WebSocket 경로: ${pathname}`);
        ws.close(1008, `Unknown WebSocket endpoint: ${pathname}`);
    }
  });

  console.log('✅ WebSocket 3채널 라우터 설정 완료');
}

module.exports = { setupWebSockets };
