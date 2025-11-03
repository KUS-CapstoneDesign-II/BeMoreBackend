const express = require('express');
const router = express.Router();
const SessionManager = require('../services/session/SessionManager');
const ctrl = require('../controllers/sessionController');
const { z } = require('zod');
const { validateBody, validateParams, validateQuery } = require('../middlewares/zod');
const startSchema = z.object({ userId: z.string().min(1), counselorId: z.string().min(1) });
const idParamSchema = z.object({ id: z.string().min(1) });
const csvQuerySchema = z.object({ kind: z.enum(['vad','emotion']).optional() });
const crypto = require('crypto');
const SessionReportGenerator = require('../services/report/SessionReportGenerator');
const PdfReportGenerator = require('../services/report/PdfReportGenerator');
const errorHandler = require('../services/ErrorHandler');
const { Report, Session: SessionModel } = require('../models');

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
router.post('/start', validateBody(startSchema), (req, res) => {
  return ctrl.start(req, res);
});

// keep existing implementation for now during gradual refactor
/*router.post('/start', (req, res) => {
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
});*/

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
router.get('/:id', validateParams(idParamSchema), (req, res) => {
  return ctrl.get(req, res);
});

/*router.get('/:id', (req, res) => {
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
});*/

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
router.post('/:id/pause', validateParams(idParamSchema), (req, res) => {
  return ctrl.pause(req, res);
});
/*router.post('/:id/pause', (req, res) => {
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
});*/

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
router.post('/:id/resume', validateParams(idParamSchema), (req, res) => {
  return ctrl.resume(req, res);
});
/*router.post('/:id/resume', (req, res) => {
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
});*/

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
router.post('/:id/end', validateParams(idParamSchema), (req, res) => {
  return ctrl.end(req, res);
});
/*router.post('/:id/end', (req, res) => {
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

    // 비동기 리포트 저장 (응답에 영향 주지 않음)
    setImmediate(() => {
      try {
        const report = reportGenerator.generateReport(session);
        const payload = {
          reportId: report.reportId,
          sessionId: session.sessionId,
          vadVector: report.vadVector || null,
          vadTimeline: report.vadTimeline || [],
          cbtSummary: report.analysis?.cbtSummary || null,
          statistics: report.statistics || null,
          metadata: report.metadata || null,
          analysis: report.analysis || null,
        };
        Report.create(payload).catch((e) => console.error('리포트 저장 실패:', e.message));
      } catch (e) {
        console.error('리포트 생성 실패:', e.message);
      }
      try {
        // 세션 요약 저장(선택)
        SessionModel.findOrCreate({ where: { sessionId: session.sessionId },
          defaults: {
            sessionId: session.sessionId,
            userId: session.userId,
            counselorId: session.counselorId || null,
            status: session.status,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            duration: SessionManager.getSessionDuration(session.sessionId),
            counters: { emotionCount: session.emotions.length }
          }
        }).then(([row, created]) => {
          if (!created) {
            row.status = session.status;
            row.endedAt = session.endedAt;
            row.duration = SessionManager.getSessionDuration(session.sessionId);
            row.counters = { emotionCount: session.emotions.length };
            row.save().catch(() => {});
          }
        }).catch(() => {});
      } catch {}
    });
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
});*/

/**
 * 세션 삭제 API (선택)
 * DELETE /api/session/:id
 */
router.delete('/:id', validateParams(idParamSchema), (req, res) => {
  return ctrl.destroy(req, res);
});
/*router.delete('/:id', (req, res) => {
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
});*/

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
router.get('/:id/vad-analysis', validateParams(idParamSchema), (req, res) => {
  return ctrl.vadAnalysis(req, res);
});
/*router.get('/:id/vad-analysis', (req, res) => {
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
});*/

/**
 * 세션 통계 API
 * GET /api/session/stats/summary
 */
router.get('/stats/summary', (req, res) => {
  return ctrl.statsSummary(req, res);
});
/*router.get('/stats/summary', (req, res) => {
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
});*/

/**
 * 사용자별 세션 목록 조회 API
 * GET /api/session/user/:userId
 */
router.get('/user/:userId', (req, res) => {
  return ctrl.userSessions(req, res);
});
/*router.get('/user/:userId', (req, res) => {
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
});*/

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
router.get('/:id/report', validateParams(idParamSchema), (req, res) => {
  return ctrl.report(req, res);
});
/*router.get('/:id/report', (req, res) => {
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
});*/

/**
 * 세션 요약 API (프론트 요약 카드용)
 * GET /api/session/:id/summary
 */
router.get('/:id/summary', validateParams(idParamSchema), (req, res) => {
  return ctrl.summary(req, res);
});
/*router.get('/:id/summary', (req, res) => {
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

    const recommendations = Array.isArray(report.analysis?.recommendations)
      ? report.analysis.recommendations.map(r => r?.title || '').filter(Boolean).slice(0, 3)
      : [];

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
        },
        recommendations
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
});*/

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
router.get('/:id/report/summary', validateParams(idParamSchema), (req, res) => {
  return ctrl.reportSummary(req, res);
});
/*router.get('/:id/report/summary', (req, res) => {
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
});*/

router.get('/:id/report/pdf', validateParams(idParamSchema), (req, res) => {
  return ctrl.reportPdf(req, res);
});

router.get('/:id/report/csv', validateParams(idParamSchema), validateQuery(csvQuerySchema), (req, res) => {
  return ctrl.reportCsv(req, res);
});

/**
 * 세션 피드백 저장 API
 * POST /api/session/:id/feedback
 *
 * Body:
 * {
 *   "rating": 1-5,      // 필수
 *   "note": "string"    // 선택
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "피드백이 저장되었습니다.",
 *   "data": {
 *     "feedbackId": "feedback_...",
 *     "sessionId": "sess_...",
 *     "rating": 5,
 *     "submittedAt": 1234567890
 *   }
 * }
 */
router.post('/:id/feedback', validateParams(idParamSchema), (req, res) => {
  return ctrl.feedback(req, res);
});

/*router.get('/:id/report/pdf', async (req, res) => {
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
});*/

// ============================================================
// 🔄 멀티모달 데이터 수집 API (Phase 4 확장)
// ============================================================

const { getInstance: getDataStore } = require('../services/inference/DataStore');
const { getInstance: getInferenceService } = require('../services/inference/InferenceService');

// 검증 스키마
const framesSchema = z.object({
  items: z.array(z.object({
    ts: z.number().min(0),
    faceLandmarksCompressed: z.string().optional(),
    qualityScore: z.number().min(0).max(1).default(0.5)
  })).min(1)
});

const audioChunksSchema = z.object({
  items: z.array(z.object({
    tsStart: z.number().min(0),
    tsEnd: z.number().min(0),
    vad: z.boolean().or(z.number().min(0).max(1)),
    rms: z.number().min(0).max(1).default(0.5),
    pitch: z.number().optional()
  })).min(1)
});

const sttSnippetsSchema = z.object({
  items: z.array(z.object({
    tsStart: z.number().min(0),
    tsEnd: z.number().min(0),
    text: z.string().min(1),
    lang: z.string().default('ko')
  })).min(1)
});

/**
 * 표정 프레임 배치 업로드 API
 * POST /api/session/:id/frames
 *
 * Body:
 * {
 *   "items": [
 *     {
 *       "ts": 1234567890000,
 *       "faceLandmarksCompressed": "base64_string",
 *       "qualityScore": 0.9
 *     },
 *     ...
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "requestId": "req_xxx",
 *   "serverTs": 1234567890000,
 *   "modelVersion": "rules-v1.0",
 *   "data": {
 *     "frameCount": 10,
 *     "totalFramesInSession": 50
 *   }
 * }
 */
router.post('/:id/frames', validateParams(idParamSchema), validateBody(framesSchema), (req, res) => {
  try {
    const sessionId = req.params.id;
    const { items } = req.body;
    const requestId = req.id || crypto.randomUUID();
    const serverTs = Date.now();

    // 세션 존재 확인
    const session = SessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        requestId,
        serverTs,
        error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` }
      });
    }

    // DataStore에 프레임 저장
    const dataStore = getDataStore();
    const savedFrames = dataStore.addFrames(sessionId, items);

    res.status(201).json({
      success: true,
      requestId,
      serverTs,
      modelVersion: 'rules-v1.0',
      data: {
        frameCount: savedFrames.length,
        totalFramesInSession: dataStore.getFramesBySession(sessionId).length
      }
    });
  } catch (error) {
    errorHandler.handle(error, {
      module: 'frames-upload',
      level: errorHandler.levels.WARN,
      metadata: { sessionId: req.params.id, endpoint: 'POST /api/session/:id/frames' }
    });
    res.status(500).json({
      success: false,
      error: { code: 'FRAMES_UPLOAD_ERROR', message: error.message }
    });
  }
});

/**
 * 음성 청크 배치 업로드 API
 * POST /api/session/:id/audio
 *
 * Body:
 * {
 *   "items": [
 *     {
 *       "tsStart": 1234567890000,
 *       "tsEnd": 1234567895000,
 *       "vad": true,
 *       "rms": 0.6,
 *       "pitch": 100.5
 *     },
 *     ...
 *   ]
 * }
 */
router.post('/:id/audio', validateParams(idParamSchema), validateBody(audioChunksSchema), (req, res) => {
  try {
    const sessionId = req.params.id;
    const { items } = req.body;
    const requestId = req.id || crypto.randomUUID();
    const serverTs = Date.now();

    // 세션 존재 확인
    const session = SessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        requestId,
        serverTs,
        error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` }
      });
    }

    // DataStore에 음성 청크 저장
    const dataStore = getDataStore();
    const savedChunks = dataStore.addAudioChunks(sessionId, items);

    res.status(201).json({
      success: true,
      requestId,
      serverTs,
      modelVersion: 'rules-v1.0',
      data: {
        audioChunkCount: savedChunks.length,
        totalAudioChunksInSession: dataStore.getAudioChunksBySession(sessionId).length
      }
    });
  } catch (error) {
    errorHandler.handle(error, {
      module: 'audio-upload',
      level: errorHandler.levels.WARN,
      metadata: { sessionId: req.params.id, endpoint: 'POST /api/session/:id/audio' }
    });
    res.status(500).json({
      success: false,
      error: { code: 'AUDIO_UPLOAD_ERROR', message: error.message }
    });
  }
});

/**
 * STT 스니펫 배치 업로드 API
 * POST /api/session/:id/stt
 *
 * Body:
 * {
 *   "items": [
 *     {
 *       "tsStart": 1234567890000,
 *       "tsEnd": 1234567895000,
 *       "text": "안녕하세요",
 *       "lang": "ko"
 *     },
 *     ...
 *   ]
 * }
 */
router.post('/:id/stt', validateParams(idParamSchema), validateBody(sttSnippetsSchema), (req, res) => {
  try {
    const sessionId = req.params.id;
    const { items } = req.body;
    const requestId = req.id || crypto.randomUUID();
    const serverTs = Date.now();

    // 세션 존재 확인
    const session = SessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        requestId,
        serverTs,
        error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` }
      });
    }

    // DataStore에 STT 스니펫 저장
    const dataStore = getDataStore();
    const savedSnippets = dataStore.addSttSnippets(sessionId, items);

    res.status(201).json({
      success: true,
      requestId,
      serverTs,
      modelVersion: 'rules-v1.0',
      data: {
        sttSnippetCount: savedSnippets.length,
        totalSttSnippetsInSession: dataStore.getSttSnippetsBySession(sessionId).length
      }
    });
  } catch (error) {
    errorHandler.handle(error, {
      module: 'stt-upload',
      level: errorHandler.levels.WARN,
      metadata: { sessionId: req.params.id, endpoint: 'POST /api/session/:id/stt' }
    });
    res.status(500).json({
      success: false,
      error: { code: 'STT_UPLOAD_ERROR', message: error.message }
    });
  }
});

/**
 * 1분 주기 멀티모달 결합 트리거 API
 * POST /api/session/:id/tick
 *
 * Body:
 * {
 *   "minuteIndex": 0
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "requestId": "req_xxx",
 *   "serverTs": 1234567890000,
 *   "modelVersion": "rules-v1.0",
 *   "data": {
 *     "minuteIndex": 0,
 *     "facialScore": 0.85,
 *     "vadScore": 0.72,
 *     "textSentiment": 0.60,
 *     "combinedScore": 0.747
 *   }
 * }
 */
router.post('/:id/tick', validateParams(idParamSchema), (req, res) => {
  try {
    const sessionId = req.params.id;
    const { minuteIndex } = req.body || {};
    const requestId = req.id || crypto.randomUUID();
    const serverTs = Date.now();

    // 세션 존재 확인
    const session = SessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        requestId,
        serverTs,
        error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` }
      });
    }

    // 유효한 minuteIndex 확인
    if (typeof minuteIndex !== 'number' || minuteIndex < 0) {
      return res.status(400).json({
        success: false,
        requestId,
        serverTs,
        error: { code: 'INVALID_MINUTE_INDEX', message: 'minuteIndex는 음이 아닌 정수여야 합니다' }
      });
    }

    // InferenceService로 1분 주기 결합 분석 수행
    const inferenceService = getInferenceService();
    const inference = inferenceService.inferForMinute(sessionId, minuteIndex, session.startedAt);

    res.status(201).json({
      success: true,
      requestId,
      serverTs,
      modelVersion: inference.modelVersion,
      data: {
        minuteIndex: inference.minuteIndex,
        facialScore: inference.facialScore,
        vadScore: inference.vadScore,
        textSentiment: inference.textSentiment,
        combinedScore: inference.combinedScore,
        dataPoints: inference.dataPoints
      }
    });
  } catch (error) {
    errorHandler.handle(error, {
      module: 'inference-tick',
      level: errorHandler.levels.WARN,
      metadata: { sessionId: req.params.id, endpoint: 'POST /api/session/:id/tick' }
    });
    res.status(500).json({
      success: false,
      error: { code: 'INFERENCE_TICK_ERROR', message: error.message }
    });
  }
});

/**
 * 세션 추론 결과 조회 API
 * GET /api/session/:id/inferences
 *
 * Response:
 * {
 *   "success": true,
 *   "requestId": "req_xxx",
 *   "serverTs": 1234567890000,
 *   "modelVersion": "rules-v1.0",
 *   "data": {
 *     "inferences": [...],
 *     "stats": { ... }
 *   }
 * }
 */
router.get('/:id/inferences', validateParams(idParamSchema), (req, res) => {
  try {
    const sessionId = req.params.id;
    const requestId = req.id || crypto.randomUUID();
    const serverTs = Date.now();

    // 세션 존재 확인
    const session = SessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        requestId,
        serverTs,
        error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` }
      });
    }

    // InferenceService로 추론 결과 및 통계 조회
    const inferenceService = getInferenceService();
    const inferences = inferenceService.getAllInferences(sessionId);
    const stats = inferenceService.getSessionStats(sessionId);

    res.json({
      success: true,
      requestId,
      serverTs,
      modelVersion: 'rules-v1.0',
      data: {
        inferences,
        stats
      }
    });
  } catch (error) {
    errorHandler.handle(error, {
      module: 'inferences-query',
      level: errorHandler.levels.WARN,
      metadata: { sessionId: req.params.id, endpoint: 'GET /api/session/:id/inferences' }
    });
    res.status(500).json({
      success: false,
      error: { code: 'INFERENCES_QUERY_ERROR', message: error.message }
    });
  }
});

module.exports = router;
