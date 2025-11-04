const SessionManager = require('../services/session/SessionManager');
const SessionReportGenerator = require('../services/report/SessionReportGenerator');
const PdfReportGenerator = require('../services/report/PdfReportGenerator');
const errorHandler = require('../services/ErrorHandler');
const sessionService = require('../services/session/sessionService');
const EmotionAnalyzer = require('../services/emotion/EmotionAnalyzer');
const crypto = require('crypto');
const { csvFromVadTimeline, csvFromEmotionTimeline } = require('../services/report/csv');

// Helpers
function buildWsUrls(req, sessionId) {
  const protocol = req.protocol === 'https' ? 'wss' : 'ws';
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  return {
    landmarks: `${baseUrl}/ws/landmarks?sessionId=${sessionId}`,
    voice: `${baseUrl}/ws/voice?sessionId=${sessionId}`,
    session: `${baseUrl}/ws/session?sessionId=${sessionId}`
  };
}

// Controllers
async function start(req, res) {
  try {
    const { userId, counselorId } = req.body || {};
    if (!userId || !counselorId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'userId와 counselorId는 필수 항목입니다' } });
    }
    const session = SessionManager.createSession({ userId, counselorId });
    const wsUrls = buildWsUrls(req, session.sessionId);

    // 📝 Supabase에 세션 정보 저장 (비동기)
    setImmediate(async () => {
      try {
        const { supabase } = require('../utils/supabase');
        const { error } = await supabase
          .from('sessions')
          .insert({
            session_id: session.sessionId,
            emotions_data: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error(`❌ Failed to create session in Supabase: ${error.message}`);
        } else {
          console.log(`✅ Session created in Supabase: ${session.sessionId}`);
        }
      } catch (dbError) {
        console.error(`❌ Error creating session in Supabase: ${dbError.message}`);
      }
    });

    return res.status(201).json({ success: true, data: { sessionId: session.sessionId, wsUrls, startedAt: session.startedAt, status: session.status, userId: session.userId, counselorId: session.counselorId } });
  } catch (error) {
    errorHandler.handle(error, { module: 'session-start', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'SESSION_CREATE_ERROR', message: error.message } });
  }
}

async function get(req, res) {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` } });
    const data = {
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
    return res.json({ success: true, data });
  } catch (error) {
    errorHandler.handle(error, { module: 'session-query', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'SESSION_QUERY_ERROR', message: error.message } });
  }
}

async function pause(req, res) {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.pauseSession(sessionId);
    return res.json({ success: true, data: { sessionId: session.sessionId, status: session.status, pausedAt: session.pausedAt } });
  } catch (error) {
    errorHandler.handle(error, { module: 'session-pause', level: errorHandler.levels.WARN });
    return res.status(400).json({ success: false, error: { code: 'SESSION_PAUSE_ERROR', message: error.message } });
  }
}

async function resume(req, res) {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.resumeSession(sessionId);
    return res.json({ success: true, data: { sessionId: session.sessionId, status: session.status, resumedAt: session.resumedAt } });
  } catch (error) {
    errorHandler.handle(error, { module: 'session-resume', level: errorHandler.levels.WARN });
    return res.status(400).json({ success: false, error: { code: 'SESSION_RESUME_ERROR', message: error.message } });
  }
}

async function end(req, res) {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.endSession(sessionId);

    console.log(`⏹️ [CRITICAL] Session end requested: ${sessionId}`);
    console.log(`⏳ [CRITICAL] Waiting 30 seconds for final Gemini responses to arrive...`);

    // ⏱️ Wait for final Gemini responses (17-21s latency) to be saved to database
    // This grace period allows emotions analyzed after session ends to still be persisted
    // Increased from 15s to 30s to accommodate Gemini's typical latency
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log(`✅ [CRITICAL] Grace period complete, fetching emotions from database...`);

    // ✅ 감정 데이터 통합 분석 (데이터베이스에서 로드)
    let emotionSummary = null;
    let finalEmotionCount = 0;

    try {
      // Try to fetch emotions from database (Sequelize or Supabase fallback)
      const models = require('../models');
      let allEmotions = [];

      if (models && models.Session && models.dbEnabled) {
        const sessionRecord = await models.Session.findOne({ where: { sessionId } });
        if (sessionRecord && sessionRecord.emotionsData && sessionRecord.emotionsData.length > 0) {
          allEmotions = sessionRecord.emotionsData.map(ed => ed.emotion);
          finalEmotionCount = allEmotions.length;
          console.log(`💾 [CRITICAL] Loaded ${finalEmotionCount} emotions from Sequelize`);
        }
      }

      // Supabase fallback when Sequelize unavailable or no data found
      if (allEmotions.length === 0 && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        try {
          const { supabase } = require('../utils/supabase');
          const { data: sbSession, error: sbErr } = await supabase
            .from('sessions')
            .select('emotions_data')
            .eq('session_id', sessionId)
            .single();

          if (!sbErr && sbSession && Array.isArray(sbSession.emotions_data)) {
            allEmotions = sbSession.emotions_data.map(ed => ed.emotion);
            finalEmotionCount = allEmotions.length;
            console.log(`💾 [CRITICAL] Loaded ${finalEmotionCount} emotions from Supabase`);
          }
        } catch (sbCatch) {
          console.warn('⚠️ [CRITICAL] Supabase fallback failed:', sbCatch.message);
        }
      }

      // Fallback to in-memory emotions if database is empty
      if (allEmotions.length === 0 && session.emotions && session.emotions.length > 0) {
        allEmotions = session.emotions.map(ed => ed.emotion);
        finalEmotionCount = allEmotions.length;
        console.log(`📊 [CRITICAL] Using ${finalEmotionCount} in-memory emotions (database empty)`);
      }

      // Analyze emotions if available
      if (allEmotions.length > 0) {
        try {
          const emotionAnalyzer = new EmotionAnalyzer();
          allEmotions.forEach((emotion, idx) => {
            // ✅ 올바른 인자: emotion, timestamp (ms), metadata
            const timestamp = Date.now() - (allEmotions.length - idx) * 1000; // 역순 타임스탬프
            emotionAnalyzer.addEmotion(emotion, timestamp, { frameCount: 30 });
          });
          emotionSummary = emotionAnalyzer.getSummary();

          // ✅ EmotionAnalyzer 반환 구조에 맞게 수정
          console.log(`📊 [CRITICAL] 감정 통합 분석 완료 (총 ${emotionSummary.totalCount}개)`);
          console.log(`   - 주요 감정: ${emotionSummary.primaryEmotion?.emotionKo} (${emotionSummary.primaryEmotion?.percentage}%)`);
          console.log(`   - 감정 상태: ${emotionSummary.emotionalState}`);

          // 세션에 분석 결과 추가
          session.emotionAnalysis = emotionSummary;
        } catch (analyzeErr) {
          console.error('❌ [CRITICAL] 감정 분석 중 오류:', analyzeErr.message);
        }
      } else {
        console.warn(`⚠️ [CRITICAL] No emotions found for session: ${sessionId}`);
      }

    } catch (dbErr) {
      console.error(`❌ [CRITICAL] Database fetch error:`, dbErr.message);
      // Continue with fallback to in-memory emotions
      if (session.emotions && session.emotions.length > 0) {
        try {
          const emotionAnalyzer = EmotionAnalyzer.fromData(session.emotions);
          emotionSummary = emotionAnalyzer.getSummary();
          console.log(`📊 [CRITICAL] Emotion analysis complete (fallback)`);
        } catch (analyzeErr) {
          console.warn('⚠️ 감정 분석 중 오류:', analyzeErr.message);
        }
      }
    }

    // 🔄 InferenceService 통계 추가
    let inferenceStats = null;
    try {
      const { getInstance: getInferenceService } = require('../services/inference/InferenceService');
      const inferenceService = getInferenceService();
      inferenceStats = inferenceService.getSessionStats(sessionId);
      console.log(`📊 [CRITICAL] Inference stats: ${inferenceStats.totalMinutes} minutes analyzed`);
    } catch (inferenceErr) {
      console.warn('⚠️ [CRITICAL] Inference stats collection failed:', inferenceErr.message);
    }

    const responseData = {
      sessionId: session.sessionId,
      status: session.status,
      endedAt: session.endedAt,
      duration: SessionManager.getSessionDuration(sessionId),
      emotionCount: finalEmotionCount,
      emotionSummary: emotionSummary ? {
        primaryEmotion: emotionSummary.primaryEmotion,
        emotionalState: emotionSummary.emotionalState,
        trend: emotionSummary.trend,
        positiveRatio: emotionSummary.positiveRatio,
        negativeRatio: emotionSummary.negativeRatio,
        topEmotions: emotionSummary.topEmotions,
        averageIntensity: emotionSummary.averageIntensity
      } : null,
      // 🔄 멀티모달 추론 통계 (Phase 4 확장)
      inferenceStats: inferenceStats || {
        totalMinutes: 0,
        avgCombinedScore: 0,
        avgFacialScore: 0,
        avgVadScore: 0,
        avgTextSentiment: 0,
        maxCombinedScore: 0,
        minCombinedScore: 0
      }
    };
    res.json({ success: true, data: responseData });

    // persist asynchronously with isolation (never crash the response)
    // Fire and forget with full error isolation in async callback
    // Background persist with full error isolation
    setImmediate(async () => {
      try {
        await sessionService.persistReportAndSession(session);
        console.log('✅ 세션 리포트 비동기 저장 완료');
      } catch (err) {
        console.warn('⚠️ 세션 리포트 비동기 저장 실패:', err?.message);
      }
    });
  } catch (error) {
    errorHandler.handle(error, { module: 'session-end', level: errorHandler.levels.ERROR });
    return res.status(400).json({ success: false, error: { code: 'SESSION_END_ERROR', message: error.message } });
  }
}

async function destroy(req, res) {
  try {
    const sessionId = req.params.id;
    const success = SessionManager.deleteSession(sessionId);
    if (!success) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` } });
    return res.json({ success: true, data: { sessionId, message: '세션이 삭제되었습니다' } });
  } catch (error) {
    errorHandler.handle(error, { module: 'session', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'SESSION_DELETE_ERROR', message: error.message } });
  }
}

async function statsSummary(req, res) {
  try {
    const stats = SessionManager.getStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    errorHandler.handle(error, { module: 'session', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'SESSION_STATS_ERROR', message: error.message } });
  }
}

async function userSessions(req, res) {
  try {
    const userId = req.params.userId;
    const sessions = SessionManager.getSessionsByUser(userId);
    const list = sessions.map(s => ({ sessionId: s.sessionId, counselorId: s.counselorId, status: s.status, startedAt: s.startedAt, endedAt: s.endedAt, duration: SessionManager.getSessionDuration(s.sessionId) }));
    return res.json({ success: true, data: { userId, count: list.length, sessions: list } });
  } catch (error) {
    errorHandler.handle(error, { module: 'session', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'USER_SESSIONS_QUERY_ERROR', message: error.message } });
  }
}

async function report(req, res) {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` } });

    let report;
    try {
      const gen = new SessionReportGenerator();
      report = gen.generateReport(session);
    } catch (reportError) {
      console.error('❌ 리포트 생성 실패:', reportError.message);
      return res.status(500).json({ success: false, error: { code: 'REPORT_GENERATION_ERROR', message: '리포트 생성 중 오류가 발생했습니다' } });
    }

    // report null 체크
    if (!report) {
      return res.status(500).json({ success: false, error: { code: 'REPORT_INVALID', message: '유효하지 않은 리포트입니다' } });
    }

    const etag = crypto.createHash('sha1').update(JSON.stringify(report)).digest('hex');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    return res.json({ success: true, data: report });
  } catch (error) {
    errorHandler.handle(error, { module: 'report', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'REPORT_GENERATION_ERROR', message: error.message } });
  }
}
async function reportCsv(req, res) {
  try {
    const sessionId = req.params.id;
    const kind = (req.query && req.query.kind) || 'vad'; // 'vad' | 'emotion'
    const session = SessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` } });
    const gen = new SessionReportGenerator();
    const report = gen.generateReport(session);
    const csv = kind === 'emotion' ? csvFromEmotionTimeline(report.emotionTimeline) : csvFromVadTimeline(report.vadTimeline);
    const filename = `bemore-${sessionId}-${kind}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).end(csv);
  } catch (error) {
    errorHandler.handle(error, { module: 'report', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'REPORT_CSV_ERROR', message: error.message } });
  }
}

async function reportSummary(req, res) {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` } });
    const gen = new SessionReportGenerator();
    const r = gen.generateReport(session);
    const summary = gen.generateTextSummary(r);
    return res.json({ success: true, data: { reportId: r.reportId, summary } });
  } catch (error) {
    errorHandler.handle(error, { module: 'report', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'REPORT_SUMMARY_ERROR', message: error.message } });
  }
}

async function summary(req, res) {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` } });

    let report;
    try {
      console.log('📋 세션 리포트 생성 시작...');
      const gen = new SessionReportGenerator();
      console.log('✅ SessionReportGenerator 생성됨');
      report = gen.generateReport(session);
      console.log('✅ 리포트 생성 성공:', report?.reportId);
    } catch (e) {
      console.error('❌ 세션 리포트 생성 실패:', e?.message);
      console.error('Stack:', e?.stack);
      return res.status(500).json({ success: false, error: { code: 'REPORT_GENERATION_ERROR', message: '리포트 생성 중 오류가 발생했습니다' } });
    }

    // Ensure report and analysis exist
    if (!report || !report.analysis) {
      return res.status(500).json({ success: false, error: { code: 'REPORT_INVALID', message: '유효하지 않은 리포트입니다' } });
    }

    let recommendations = [];
    try {
      if (Array.isArray(report.analysis?.recommendations)) {
        recommendations = report.analysis.recommendations.map(r => r?.title || '').filter(Boolean).slice(0, 3);
      }
    } catch (recErr) {
      console.warn('⚠️ 권장사항 처리 중 에러:', recErr?.message);
    }

    try {
      const payload = {
        sessionId: session.sessionId,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: report.metadata?.duration || 0,
        vadVector: report.vadVector || report.analysis?.vadVector || null,
        keyObservations: report.analysis?.overallAssessment?.keyObservations || [],
        dominantEmotion: report.analysis?.emotionSummary?.dominantEmotion || null,
        averageVoiceMetrics: report.analysis?.vadSummary?.averageMetrics || null,
        cbt: { totalDistortions: report.analysis?.cbtSummary?.totalDistortions || 0, mostCommon: report.analysis?.cbtSummary?.mostCommonDistortion || null },
        recommendations
      };
      const etag = crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.setHeader('ETag', etag);
      if (req.headers['if-none-match'] === etag) return res.status(304).end();
      return res.json({ success: true, data: payload });
    } catch (payloadErr) {
      console.error('❌ 페이로드 구성 중 에러:', payloadErr?.message, payloadErr?.stack);
      return res.status(500).json({ success: false, error: { code: 'PAYLOAD_ERROR', message: '응답 구성 중 오류가 발생했습니다' } });
    }
  } catch (error) {
    console.error('❌ summary 함수 최상위 예외:', error?.message, error?.stack);
    errorHandler.handle(error, { module: 'session-summary', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'SESSION_SUMMARY_ERROR', message: error.message } });
  }
}

async function reportPdf(req, res) {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` } });
    const report = new SessionReportGenerator().generateReport(session);
    const pdfBuffer = await PdfReportGenerator.generate(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bemore-report-${sessionId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(200).end(pdfBuffer);
  } catch (error) {
    errorHandler.handle(error, { module: 'report', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'REPORT_PDF_ERROR', message: error.message } });
  }
}

async function vadAnalysis(req, res) {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: `세션을 찾을 수 없습니다: ${sessionId}` } });
    const currentMetrics = session.vadMetrics ? session.vadMetrics.calculate() : null;
    const psychological = session.psychIndicators && currentMetrics ? session.psychIndicators.analyze(currentMetrics) : null;
    const timeSeries = session.vadMetrics ? session.vadMetrics.getTimeSeries(10000) : [];
    return res.json({ success: true, data: { sessionId: session.sessionId, currentMetrics, psychological, history: session.vadAnalysisHistory || [], timeSeries, lastUpdate: Date.now() } });
  } catch (error) {
    errorHandler.handle(error, { module: 'session', level: errorHandler.levels.ERROR });
    return res.status(500).json({ success: false, error: { code: 'VAD_ANALYSIS_ERROR', message: error.message } });
  }
}

/**
 * 세션 피드백 저장
 * POST /api/session/:id/feedback
 *
 * Body:
 * {
 *   "rating": 1-5,
 *   "note": "optional feedback text"
 * }
 */
async function feedback(req, res) {
  try {
    const sessionId = req.params.id;
    const { rating, note } = req.body || {};

    // 입력 검증
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RATING',
          message: 'rating은 1~5 사이의 정수여야 합니다'
        }
      });
    }

    // 세션 존재 여부 확인
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

    // 피드백 저장 (메모리에 저장)
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const submittedAt = Date.now();

    // SessionManager에 feedback 저장
    if (!session.feedback) {
      session.feedback = [];
    }
    session.feedback.push({
      feedbackId,
      sessionId,
      rating: parseInt(rating, 10),
      note: note || null,
      submittedAt
    });

    // DB 저장 시도 (선택사항, 에러 무시)
    if (process.env.DB_DISABLED !== 'true') {
      try {
        const models = require('../models');
        if (models.Feedback && models.sequelize && models.sequelize.authenticate) {
          await models.Feedback.create({
            feedbackId,
            sessionId,
            rating: parseInt(rating, 10),
            note: note || null,
            submittedAt
          }).catch(err => {
            console.warn('⚠️ 피드백 DB 저장 실패:', err.message);
          });
        }
      } catch (dbError) {
        // DB 저장 실패해도 무시 (메모리에는 이미 저장됨)
        console.warn('⚠️ DB 저장 시도 중 에러:', dbError.message);
      }
    }

    console.log(`✅ 세션 피드백 저장: ${feedbackId} (세션: ${sessionId}, 평점: ${rating})`);

    return res.status(201).json({
      success: true,
      message: '피드백이 저장되었습니다',
      data: {
        feedbackId,
        sessionId,
        rating: parseInt(rating, 10),
        submittedAt
      }
    });

  } catch (error) {
    errorHandler.handle(error, {
      module: 'session-feedback',
      level: errorHandler.levels.ERROR,
      metadata: { sessionId: req.params.id }
    });
    return res.status(500).json({
      success: false,
      error: {
        code: 'FEEDBACK_SAVE_ERROR',
        message: error.message
      }
    });
  }
}

module.exports = {
  start,
  get,
  pause,
  resume,
  end,
  destroy,
  statsSummary,
  userSessions,
  report,
  summary,
  reportSummary,
  reportCsv,
  reportPdf,
  vadAnalysis,
  feedback,
};


