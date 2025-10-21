const SessionReportGenerator = require('../report/SessionReportGenerator');
const { Report, Session } = require('../../models');
const SessionManager = require('../session/SessionManager');

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
    if (Report && typeof Report.create === 'function') {
      await Report.create(payload).catch(() => {});
    }
    if (Session && typeof Session.findOrCreate === 'function') {
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
      await Session.findOrCreate({ where: { sessionId: session.sessionId }, defaults })
        .then(async ([row, created]) => {
          if (!created) {
            row.status = session.status;
            row.endedAt = session.endedAt;
            row.duration = defaults.duration;
            row.counters = defaults.counters;
            await row.save().catch(() => {});
          }
        }).catch(() => {});
    }
  } catch {
    // swallow
  }
}

module.exports = { persistReportAndSession };


