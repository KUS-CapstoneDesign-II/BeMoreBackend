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
  // 모든 작업을 완전히 격리하여 에러가 전파되지 않도록 함
  if (!session || !session.sessionId) {
    return;
  }

  // 리포트 생성은 선택사항 (에러 발생 가능성 높음)
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

    // DB 저장도 완전히 격리
    try {
      if (reportRepo && typeof reportRepo.create === 'function') {
        await reportRepo.create(payload);
      }
    } catch {}
  } catch {}

  // 세션 메타데이터 저장도 선택사항
  try {
    const defaults = {
      sessionId: session.sessionId,
      userId: session.userId,
      counselorId: session.counselorId || null,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      duration: SessionManager.getSessionDuration(session.sessionId),
      counters: { emotionCount: session.emotions ? session.emotions.length : 0 }
    };

    try {
      if (sessionRepo && typeof sessionRepo.upsertSummary === 'function') {
        await sessionRepo.upsertSummary(defaults);
      }
    } catch {}
  } catch {}

  // 어떤 에러가 발생하든 절대 외부로 전파되지 않음
}

module.exports = { persistReportAndSession };


