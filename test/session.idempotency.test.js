const SessionManager = require('../services/session/SessionManager');

describe('SessionManager idempotency', () => {
  let sessionId;

  beforeAll(() => {
    const s = SessionManager.createSession({ userId: 'u1', counselorId: 'c1' });
    sessionId = s.sessionId;
  });

  test('pause is idempotent', () => {
    const s1 = SessionManager.pauseSession(sessionId);
    const pausedAt = s1.pausedAt;
    const s2 = SessionManager.pauseSession(sessionId); // duplicate
    expect(s2.status).toBe('paused');
    expect(s2.pausedAt).toBe(pausedAt);
  });

  test('resume is idempotent', () => {
    const s1 = SessionManager.resumeSession(sessionId);
    const resumedAt = s1.resumedAt;
    const s2 = SessionManager.resumeSession(sessionId); // duplicate
    expect(s2.status).toBe('active');
    expect(s2.resumedAt).toBe(resumedAt);
  });

  test('end is idempotent', () => {
    const s1 = SessionManager.endSession(sessionId);
    const endedAt = s1.endedAt;
    const s2 = SessionManager.endSession(sessionId); // duplicate
    expect(s2.status).toBe('ended');
    expect(s2.endedAt).toBe(endedAt);
  });
});


