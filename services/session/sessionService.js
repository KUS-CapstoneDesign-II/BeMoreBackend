const SessionReportGenerator = require('../report/SessionReportGenerator');
const SessionManager = require('../session/SessionManager');
const reportRepo = require('../../repositories/reportRepository');
const sessionRepo = require('../../repositories/sessionRepository');

/**
 * persistReportAndSession
 * - Generate report from in-memory session and persist lightweight rows
 * - DB 연결이 없어도 함수 호출은 안전(no-throw)하게 처리
 */
async function persistReportAndSession(session) {
  try {
    const gen = new SessionReportGenerator();
    const report = gen.generateReport(session);
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
    await reportRepo.create(payload);
    const defaults = {
        sessionId: session.sessionId,
        userId: session.userId,
        counselorId: session.counselorId || null,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: SessionManager.getSessionDuration(session.sessionId),
        counters: { emotionCount: session.emotions.length }
      };
    await sessionRepo.upsertSummary(defaults);
  } catch {
    // swallow
  }
}

module.exports = { persistReportAndSession };


