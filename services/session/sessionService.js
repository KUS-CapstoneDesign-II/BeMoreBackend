const SessionReportGenerator = require('../report/SessionReportGenerator');
const SessionManager = require('../session/SessionManager');
const reportRepo = require('../../repositories/reportRepository');
const sessionRepo = require('../../repositories/sessionRepository');

/**
 * persistReportAndSession
 * - Generate report from in-memory session and persist lightweight rows
 * - DB 연결이 없어도 함수 호출은 안전(no-throw)하게 처리
 * - 모든 에러를 완전히 격리 (Promise rejection 포함)
 */
async function persistReportAndSession(session) {
  // COMPLETE ERROR ISOLATION - 어떤 에러도 외부로 전파되지 않음
  try {
    // 기본 검증
    if (!session || !session.sessionId) {
      return;
    }

    // 리포트 생성은 선택사항 (에러 발생 가능성 높음)
    let report = null;
    try {
      const gen = new SessionReportGenerator();
      report = gen.generateReport(session);
      if (!report) return; // report 생성 실패
    } catch (reportErr) {
      console.warn('⚠️ 리포트 생성 중 에러 (무시됨):', reportErr?.message);
      // 리포트 생성 실패는 무시하고 계속
      return;
    }

    // 리포트 저장 (선택사항)
    if (report && report.reportId) {
      try {
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

        if (reportRepo && typeof reportRepo.create === 'function') {
          await reportRepo.create(payload);
        }
      } catch (saveErr) {
        console.warn('⚠️ 리포트 저장 중 에러 (무시됨):', saveErr?.message);
      }
    }

    // 세션 메타데이터 저장 (선택사항)
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

      if (sessionRepo && typeof sessionRepo.upsertSummary === 'function') {
        await sessionRepo.upsertSummary(defaults);
      }
    } catch (metaErr) {
      console.warn('⚠️ 세션 메타데이터 저장 중 에러 (무시됨):', metaErr?.message);
    }
  } catch (outerErr) {
    // 최외곽 에러 격리 - 어떤 에러도 외부로 전파되지 않음
    console.warn('⚠️ persistReportAndSession 중 예상치 못한 에러 (무시됨):', outerErr?.message);
  }

  // 함수 종료 - 어떤 에러도 발생하지 않음
}

module.exports = { persistReportAndSession };


