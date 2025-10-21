const SessionManager = require('../services/session/SessionManager');
const SessionReportGenerator = require('../services/report/SessionReportGenerator');
const PdfReportGenerator = require('../services/report/PdfReportGenerator');
const errorHandler = require('../services/ErrorHandler');
const sessionService = require('../services/session/sessionService');
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
    const responseData = {
      sessionId: session.sessionId,
      status: session.status,
      endedAt: session.endedAt,
      duration: SessionManager.getSessionDuration(sessionId),
      emotionCount: session.emotions.length
    };
    res.json({ success: true, data: responseData });
    // persist asynchronously
    sessionService.persistReportAndSession(session).catch(() => {});
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
    const report = new SessionReportGenerator().generateReport(session);
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
    const gen = new SessionReportGenerator();
    const report = gen.generateReport(session);
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
      cbt: { totalDistortions: report.analysis?.cbtSummary?.totalDistortions || 0, mostCommon: report.analysis?.cbtSummary?.mostCommonDistortion || null },
      recommendations
    };
    const etag = crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    return res.json({ success: true, data: payload });
  } catch (error) {
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
};


