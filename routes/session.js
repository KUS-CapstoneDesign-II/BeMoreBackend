const express = require('express');
const router = express.Router();
const SessionManager = require('../services/session/SessionManager');

/**
 * 세션 시작 API
 * POST /api/session/start
 *
 * Body:
 * {
 *   "userId": "user_001",
 *   "counselorId": "counselor_001"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "sessionId": "sess_1737250800_abc123",
 *     "wsUrls": {
 *       "landmarks": "ws://localhost:8000/ws/landmarks?sessionId=sess_...",
 *       "voice": "ws://localhost:8000/ws/voice?sessionId=sess_...",
 *       "session": "ws://localhost:8000/ws/session?sessionId=sess_..."
 *     },
 *     "startedAt": 1737250800000,
 *     "status": "active"
 *   }
 * }
 */
router.post('/start', (req, res) => {
  try {
    const { userId, counselorId } = req.body;

    // 입력 검증
    if (!userId || !counselorId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'userId와 counselorId는 필수 항목입니다'
        }
      });
    }

    // 세션 생성
    const session = SessionManager.createSession({ userId, counselorId });

    // WebSocket URL 생성
    const protocol = req.protocol === 'https' ? 'wss' : 'ws';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const wsUrls = {
      landmarks: `${baseUrl}/ws/landmarks?sessionId=${session.sessionId}`,
      voice: `${baseUrl}/ws/voice?sessionId=${session.sessionId}`,
      session: `${baseUrl}/ws/session?sessionId=${session.sessionId}`
    };

    // 응답
    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        wsUrls,
        startedAt: session.startedAt,
        status: session.status,
        userId: session.userId,
        counselorId: session.counselorId
      }
    });

    console.log(`📡 세션 시작 API 호출 성공: ${session.sessionId}`);

  } catch (error) {
    console.error('❌ 세션 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSION_CREATE_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 세션 조회 API
 * GET /api/session/:id
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "sessionId": "sess_...",
 *     "userId": "user_001",
 *     "status": "active",
 *     "startedAt": 1737250800000,
 *     "duration": 60000,
 *     "emotionCount": 6
 *   }
 * }
 */
router.get('/:id', (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `세션을 찾을 수 없습니다: ${sessionId}`
        }
      });
    }

    // 민감한 데이터 제외하고 응답
    const responseData = {
      sessionId: session.sessionId,
      userId: session.userId,
      counselorId: session.counselorId,
      status: session.status,
      startedAt: session.startedAt,
      pausedAt: session.pausedAt,
      resumedAt: session.resumedAt,
      endedAt: session.endedAt,
      duration: SessionManager.getSessionDuration(sessionId),
      emotionCount: session.emotions.length,
      landmarkCount: session.landmarkBuffer.length,
      sttCount: session.sttBuffer.length
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ 세션 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSION_QUERY_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 세션 일시정지 API
 * POST /api/session/:id/pause
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "sessionId": "sess_...",
 *     "status": "paused",
 *     "pausedAt": 1737250860000
 *   }
 * }
 */
router.post('/:id/pause', (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.pauseSession(sessionId);

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
        pausedAt: session.pausedAt
      }
    });

    console.log(`⏸️ 세션 일시정지 API 호출: ${sessionId}`);

  } catch (error) {
    console.error('❌ 세션 일시정지 오류:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'SESSION_PAUSE_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 세션 재개 API
 * POST /api/session/:id/resume
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "sessionId": "sess_...",
 *     "status": "active",
 *     "resumedAt": 1737250920000
 *   }
 * }
 */
router.post('/:id/resume', (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.resumeSession(sessionId);

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
        resumedAt: session.resumedAt
      }
    });

    console.log(`▶️ 세션 재개 API 호출: ${sessionId}`);

  } catch (error) {
    console.error('❌ 세션 재개 오류:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'SESSION_RESUME_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 세션 종료 API
 * POST /api/session/:id/end
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "sessionId": "sess_...",
 *     "status": "ended",
 *     "endedAt": 1737251400000,
 *     "duration": 600000
 *   }
 * }
 */
router.post('/:id/end', (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.endSession(sessionId);

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
        endedAt: session.endedAt,
        duration: SessionManager.getSessionDuration(sessionId),
        emotionCount: session.emotions.length
      }
    });

    console.log(`✅ 세션 종료 API 호출: ${sessionId}`);

  } catch (error) {
    console.error('❌ 세션 종료 오류:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'SESSION_END_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 세션 삭제 API (선택)
 * DELETE /api/session/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const sessionId = req.params.id;
    const success = SessionManager.deleteSession(sessionId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: `세션을 찾을 수 없습니다: ${sessionId}`
        }
      });
    }

    res.json({
      success: true,
      data: {
        sessionId,
        message: '세션이 삭제되었습니다'
      }
    });

    console.log(`🗑️ 세션 삭제 API 호출: ${sessionId}`);

  } catch (error) {
    console.error('❌ 세션 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSION_DELETE_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 세션 통계 API
 * GET /api/session/stats/summary
 */
router.get('/stats/summary', (req, res) => {
  try {
    const stats = SessionManager.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ 세션 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSION_STATS_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 사용자별 세션 목록 조회 API
 * GET /api/session/user/:userId
 */
router.get('/user/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const sessions = SessionManager.getSessionsByUser(userId);

    const sessionList = sessions.map(session => ({
      sessionId: session.sessionId,
      counselorId: session.counselorId,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      duration: SessionManager.getSessionDuration(session.sessionId)
    }));

    res.json({
      success: true,
      data: {
        userId,
        count: sessionList.length,
        sessions: sessionList
      }
    });

  } catch (error) {
    console.error('❌ 사용자별 세션 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_SESSIONS_QUERY_ERROR',
        message: error.message
      }
    });
  }
});

module.exports = router;
