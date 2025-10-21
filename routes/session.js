const express = require('express');
const router = express.Router();
const SessionManager = require('../services/session/SessionManager');
const crypto = require('crypto');
const SessionReportGenerator = require('../services/report/SessionReportGenerator');
const PdfReportGenerator = require('../services/report/PdfReportGenerator');
const errorHandler = require('../services/ErrorHandler');

// 리포트 생성기 초기화
const reportGenerator = new SessionReportGenerator();

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
    errorHandler.handle(error, {
      module: 'session-start',
      level: errorHandler.levels.ERROR,
      metadata: { userId: req.body.userId, counselorId: req.body.counselorId }
    });
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
    errorHandler.handle(error, {
      module: 'session-query',
      level: errorHandler.levels.ERROR,
      metadata: { sessionId: req.params.sessionId }
    });
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
    errorHandler.handle(error, {
      module: 'session-pause',
      level: errorHandler.levels.WARN,
      metadata: { sessionId: req.params.sessionId }
    });
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
    errorHandler.handle(error, {
      module: 'session-resume',
      level: errorHandler.levels.WARN,
      metadata: { sessionId: req.params.id }
    });
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

     //======================================================================================================================================
    // 기본 응답 데이터
    const responseData = {
      sessionId: session.sessionId,
      status: session.status,
      endedAt: session.endedAt,
      duration: SessionManager.getSessionDuration(sessionId),
      emotionCount: session.emotions.length
    };

    // 쿼리로 includeReport=true 가 오면 최종 리포트 생성
    if (req.query && req.query.includeReport === 'true') {
      const { generateFinalReport } = require('../services/report/FinalReportService');

      generateFinalReport(session)
        .then((report) => {
          responseData.finalReport = report;
          res.json({ success: true, data: responseData });
        })
        .catch((err) => {
          console.error('최종 리포트 생성 오류:', err);
          // 리포트 생성 실패해도 세션 종료 자체는 성공 응답
          responseData.finalReportError = err.message;
          res.json({ success: true, data: responseData });
        });

      console.log(`✅ 세션 종료 및 리포트 생성 API 호출: ${sessionId}`);
      return;
    }

    res.json({ success: true, data: responseData });
     //======================================================================================================================================

    console.log(`✅ 세션 종료 API 호출: ${sessionId}`);

  } catch (error) {
    errorHandler.handle(error, {
      module: 'session-end',
      level: errorHandler.levels.ERROR,
      metadata: { sessionId: req.params.id }
    });
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
    errorHandler.handle(error, {
      module: 'session',
      level: errorHandler.levels.ERROR,
      metadata: { sessionId: req.params.id, endpoint: 'DELETE /api/session/:id' }
    });
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
 * VAD 분석 결과 조회 API (Phase 2)
 * GET /api/session/:id/vad-analysis
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "currentMetrics": { ... },
 *     "psychological": { ... },
 *     "history": [ ... ],
 *     "timeSeries": [ ... ]
 *   }
 * }
 */
router.get('/:id/vad-analysis', (req, res) => {
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

    // VAD 메트릭 및 심리 지표 조회
    const currentMetrics = session.vadMetrics ? session.vadMetrics.calculate() : null;
    const psychological = session.psychIndicators && currentMetrics
      ? session.psychIndicators.analyze(currentMetrics)
      : null;

    const timeSeries = session.vadMetrics
      ? session.vadMetrics.getTimeSeries(10000)
      : [];

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        currentMetrics,
        psychological,
        history: session.vadAnalysisHistory || [],
        timeSeries,
        lastUpdate: Date.now()
      }
    });

    console.log(`📊 VAD 분석 결과 조회: ${sessionId}`);

  } catch (error) {
    errorHandler.handle(error, {
      module: 'session',
      level: errorHandler.levels.ERROR,
      metadata: { sessionId: req.params.id, endpoint: 'GET /api/session/:id/vad-analysis' }
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'VAD_ANALYSIS_ERROR',
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
    errorHandler.handle(error, {
      module: 'session',
      level: errorHandler.levels.ERROR,
      metadata: { endpoint: 'GET /api/session/stats/summary' }
    });
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
    errorHandler.handle(error, {
      module: 'session',
      level: errorHandler.levels.ERROR,
      metadata: { userId: req.params.userId, endpoint: 'GET /api/session/user/:userId' }
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_SESSIONS_QUERY_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 세션 리포트 생성 API (Phase 4)
 * GET /api/session/:id/report
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "reportId": "report_...",
 *     "metadata": { ... },
 *     "analysis": { ... },
 *     "emotionTimeline": { ... },
 *     "vadTimeline": { ... },
 *     "cbtDetails": { ... },
 *     "statistics": { ... }
 *   }
 * }
 */
router.get('/:id/report', (req, res) => {
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

    // 리포트 생성
    const report = reportGenerator.generateReport(session);

    // ETag/Cache-Control (60s) for lightweight caching
    const etag = crypto.createHash('sha1').update(JSON.stringify(report)).digest('hex');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.json({ success: true, data: report });

    console.log(`📊 세션 리포트 생성: ${sessionId}`);

  } catch (error) {
    errorHandler.handle(error, {
      module: 'report',
      level: errorHandler.levels.ERROR,
      metadata: { sessionId: req.params.id, endpoint: 'GET /api/session/:id/report' }
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_GENERATION_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 세션 요약 API (프론트 요약 카드용)
 * GET /api/session/:id/summary
 */
router.get('/:id/summary', (req, res) => {
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

    // 리포트 생성(메모리 기반)
    const report = reportGenerator.generateReport(session);

    const payload = {
        sessionId: session.sessionId,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: report.metadata.duration,
        vadVector: report.vadVector || report.analysis?.vadVector || null,
        keyObservations: report.analysis?.overallAssessment?.keyObservations || [],
        dominantEmotion: report.analysis?.emotionSummary?.dominantEmotion || null,
        averageVoiceMetrics: report.analysis?.vadSummary?.averageMetrics || null,
        cbt: {
          totalDistortions: report.analysis?.cbtSummary?.totalDistortions || 0,
          mostCommon: report.analysis?.cbtSummary?.mostCommonDistortion || null
        }
      };

    const etag = crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.json({ success: true, data: payload });

  } catch (error) {
    errorHandler.handle(error, {
      module: 'session-summary',
      level: errorHandler.levels.ERROR,
      metadata: { sessionId: req.params.id, endpoint: 'GET /api/session/:id/summary' }
    });
    res.status(500).json({
      success: false,
      error: { code: 'SESSION_SUMMARY_ERROR', message: error.message }
    });
  }
});

/**
 * 세션 리포트 텍스트 요약 API (Phase 4)
 * GET /api/session/:id/report/summary
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "summary": "=== BeMore 심리 상담 세션 리포트 ===\n..."
 *   }
 * }
 */
router.get('/:id/report/summary', (req, res) => {
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

    // 리포트 생성 및 텍스트 요약
    const report = reportGenerator.generateReport(session);
    const summary = reportGenerator.generateTextSummary(report);

    res.json({
      success: true,
      data: {
        reportId: report.reportId,
        summary
      }
    });

    console.log(`📄 세션 리포트 요약 생성: ${sessionId}`);

  } catch (error) {
    errorHandler.handle(error, {
      module: 'report',
      level: errorHandler.levels.ERROR,
      metadata: { sessionId: req.params.id, endpoint: 'GET /api/session/:id/report/summary' }
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_SUMMARY_ERROR',
        message: error.message
      }
    });
  }
});

router.get('/:id/report/pdf', async (req, res) => {
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

    const report = reportGenerator.generateReport(session);
    const pdfBuffer = await PdfReportGenerator.generate(report);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bemore-report-${sessionId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(200).end(pdfBuffer);

  } catch (error) {
    errorHandler.handle(error, {
      module: 'report',
      level: errorHandler.levels.ERROR,
      metadata: { sessionId: req.params.id, endpoint: 'GET /api/session/:id/report/pdf' }
    });
    res.status(500).json({
      success: false,
      error: { code: 'REPORT_PDF_ERROR', message: error.message }
    });
  }
});

module.exports = router;
