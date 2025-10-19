const crypto = require('crypto');

// UUID v4 생성 함수 (uuid 패키지 대신 crypto 사용)
function generateUuid() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 메모리 기반 세션 관리 시스템
 * - 세션 생성, 조회, 일시정지, 재개, 종료 기능 제공
 * - WebSocket 연결 관리
 * - 표정/음성/STT 데이터 버퍼 관리
 */
class SessionManager {
  constructor() {
    this.sessions = new Map();
    console.log('✅ SessionManager 초기화 완료');
  }

  /**
   * 새로운 세션 생성
   * @param {Object} params - 세션 생성 파라미터
   * @param {string} params.userId - 사용자 ID
   * @param {string} params.counselorId - 상담사 ID
   * @returns {Object} 생성된 세션 객체
   */
  createSession({ userId, counselorId }) {
    const timestamp = Date.now();
    const randomId = generateUuid().slice(0, 8);
    const sessionId = `sess_${timestamp}_${randomId}`;

    const session = {
      // 세션 메타데이터
      sessionId,
      userId,
      counselorId,
      status: 'active',

      // 시간 정보
      startedAt: timestamp,
      pausedAt: null,
      resumedAt: null,
      endedAt: null,

      // 데이터 버퍼
      landmarkBuffer: [],    // 얼굴 랜드마크 데이터
      sttBuffer: [],         // STT 텍스트 데이터
      vadBuffer: [],         // VAD 음성 활동 데이터 (Phase 2)
      emotions: [],          // 감정 분석 결과

      // WebSocket 연결
      wsConnections: {
        landmarks: null,     // 표정 데이터 채널
        voice: null,         // 음성 데이터 채널
        session: null        // 세션 제어 채널
      },

      // 클라이언트 정보
      metadata: {
        clientIP: null,
        userAgent: null,
        deviceType: null
      }
    };

    this.sessions.set(sessionId, session);
    console.log(`✅ 세션 생성: ${sessionId} (사용자: ${userId}, 상담사: ${counselorId})`);

    return session;
  }

  /**
   * 세션 조회
   * @param {string} sessionId - 세션 ID
   * @returns {Object|null} 세션 객체 또는 null
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.warn(`⚠️ 세션 없음: ${sessionId}`);
      return null;
    }

    return session;
  }

  /**
   * 모든 세션 조회
   * @returns {Array} 모든 세션 배열
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * 세션 일시정지
   * @param {string} sessionId - 세션 ID
   * @returns {Object} 업데이트된 세션 객체
   * @throws {Error} 세션이 없거나 활성 상태가 아닌 경우
   */
  pauseSession(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`활성 세션이 아닙니다: ${sessionId} (현재 상태: ${session.status})`);
    }

    session.status = 'paused';
    session.pausedAt = Date.now();

    console.log(`⏸️ 세션 일시정지: ${sessionId}`);
    return session;
  }

  /**
   * 세션 재개
   * @param {string} sessionId - 세션 ID
   * @returns {Object} 업데이트된 세션 객체
   * @throws {Error} 세션이 없거나 일시정지 상태가 아닌 경우
   */
  resumeSession(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
    }

    if (session.status !== 'paused') {
      throw new Error(`일시정지 세션이 아닙니다: ${sessionId} (현재 상태: ${session.status})`);
    }

    session.status = 'active';
    session.resumedAt = Date.now();

    console.log(`▶️ 세션 재개: ${sessionId}`);
    return session;
  }

  /**
   * 세션 종료
   * @param {string} sessionId - 세션 ID
   * @returns {Object} 종료된 세션 객체
   * @throws {Error} 세션이 없는 경우
   */
  endSession(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      throw new Error(`세션을 찾을 수 없습니다: ${sessionId}`);
    }

    // 세션 상태 업데이트
    session.status = 'ended';
    session.endedAt = Date.now();

    // WebSocket 연결 종료
    Object.entries(session.wsConnections).forEach(([type, ws]) => {
      if (ws && ws.readyState === 1) {  // 1 = OPEN
        ws.close(1000, 'Session ended');
        console.log(`🔌 WebSocket 종료: ${type}`);
      }
    });

    const duration = this.getSessionDuration(sessionId);
    console.log(`✅ 세션 종료: ${sessionId} (지속 시간: ${Math.floor(duration / 1000)}초)`);

    return session;
  }

  /**
   * 세션 삭제 (메모리에서 제거)
   * @param {string} sessionId - 세션 ID
   * @returns {boolean} 삭제 성공 여부
   */
  deleteSession(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      return false;
    }

    // 세션이 활성 상태면 먼저 종료
    if (session.status !== 'ended') {
      this.endSession(sessionId);
    }

    this.sessions.delete(sessionId);
    console.log(`🗑️ 세션 삭제: ${sessionId}`);

    return true;
  }

  /**
   * 세션 지속 시간 계산
   * @param {string} sessionId - 세션 ID
   * @returns {number} 세션 지속 시간 (밀리초)
   */
  getSessionDuration(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      return 0;
    }

    const endTime = session.endedAt || Date.now();
    return endTime - session.startedAt;
  }

  /**
   * 활성 세션 개수 조회
   * @returns {number} 활성 세션 수
   */
  getActiveSessionCount() {
    return Array.from(this.sessions.values()).filter(
      session => session.status === 'active'
    ).length;
  }

  /**
   * 사용자별 세션 조회
   * @param {string} userId - 사용자 ID
   * @returns {Array} 해당 사용자의 세션 배열
   */
  getSessionsByUser(userId) {
    return Array.from(this.sessions.values()).filter(
      session => session.userId === userId
    );
  }

  /**
   * 상담사별 세션 조회
   * @param {string} counselorId - 상담사 ID
   * @returns {Array} 해당 상담사의 세션 배열
   */
  getSessionsByCounselor(counselorId) {
    return Array.from(this.sessions.values()).filter(
      session => session.counselorId === counselorId
    );
  }

  /**
   * 세션 통계 조회
   * @returns {Object} 세션 통계 정보
   */
  getStats() {
    const sessions = Array.from(this.sessions.values());

    return {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      paused: sessions.filter(s => s.status === 'paused').length,
      ended: sessions.filter(s => s.status === 'ended').length,
      avgDuration: sessions.length > 0
        ? sessions.reduce((sum, s) => sum + this.getSessionDuration(s.sessionId), 0) / sessions.length
        : 0
    };
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const sessionManager = new SessionManager();
module.exports = sessionManager;
