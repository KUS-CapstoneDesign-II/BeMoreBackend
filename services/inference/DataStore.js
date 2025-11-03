/**
 * DataStore - 세션별 멀티모달 데이터 저장소
 *
 * 역할:
 * - frames: 표정 랜드마크 데이터
 * - audioChunks: 음성 청크 데이터 (VAD 포함)
 * - sttSnippets: STT 텍스트 데이터
 * - inferences: 1분 주기 결합 분석 결과
 * - reports: 세션 종료 리포트
 */

class DataStore {
  constructor() {
    this.data = {
      frames: [],           // { id, sessionId, ts, faceLandmarksCompressed, qualityScore }
      audioChunks: [],      // { id, sessionId, tsStart, tsEnd, vad, rms, pitch }
      sttSnippets: [],      // { id, sessionId, tsStart, tsEnd, text, lang }
      inferences: [],       // { id, sessionId, minuteIndex, facialScore, vadScore, textSentiment, combinedScore, modelVersion }
      reports: []           // { id, sessionId, summary, risks, recommendations, stats }
    };
  }

  // ===== Frames (표정 데이터) =====

  /**
   * 표정 프레임 추가
   * @param {string} sessionId
   * @param {Object} frame - { ts, faceLandmarksCompressed, qualityScore }
   * @returns {Object} 저장된 프레임 (id 포함)
   */
  addFrame(sessionId, frame) {
    const id = `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entry = { id, sessionId, ...frame };
    this.data.frames.push(entry);
    return entry;
  }

  /**
   * 배치로 프레임 추가
   * @param {string} sessionId
   * @param {Array} frames - [{ ts, faceLandmarksCompressed, qualityScore }, ...]
   * @returns {Array} 저장된 프레임들
   */
  addFrames(sessionId, frames) {
    return frames.map(frame => this.addFrame(sessionId, frame));
  }

  /**
   * 세션별 표정 프레임 조회
   * @param {string} sessionId
   * @returns {Array} 해당 세션의 모든 프레임
   */
  getFramesBySession(sessionId) {
    return this.data.frames.filter(f => f.sessionId === sessionId);
  }

  /**
   * 시간 구간별 프레임 조회
   * @param {string} sessionId
   * @param {number} tsStart
   * @param {number} tsEnd
   * @returns {Array}
   */
  getFramesByTimeRange(sessionId, tsStart, tsEnd) {
    return this.data.frames.filter(
      f => f.sessionId === sessionId && f.ts >= tsStart && f.ts <= tsEnd
    );
  }

  // ===== Audio Chunks (음성 데이터) =====

  /**
   * 음성 청크 추가
   * @param {string} sessionId
   * @param {Object} chunk - { tsStart, tsEnd, vad, rms, pitch? }
   * @returns {Object} 저장된 청크
   */
  addAudioChunk(sessionId, chunk) {
    const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entry = { id, sessionId, ...chunk };
    this.data.audioChunks.push(entry);
    return entry;
  }

  /**
   * 배치로 음성 청크 추가
   * @param {string} sessionId
   * @param {Array} chunks
   * @returns {Array}
   */
  addAudioChunks(sessionId, chunks) {
    return chunks.map(chunk => this.addAudioChunk(sessionId, chunk));
  }

  /**
   * 세션별 음성 청크 조회
   * @param {string} sessionId
   * @returns {Array}
   */
  getAudioChunksBySession(sessionId) {
    return this.data.audioChunks.filter(c => c.sessionId === sessionId);
  }

  /**
   * 시간 구간별 음성 청크 조회
   * @param {string} sessionId
   * @param {number} tsStart
   * @param {number} tsEnd
   * @returns {Array}
   */
  getAudioChunksByTimeRange(sessionId, tsStart, tsEnd) {
    return this.data.audioChunks.filter(
      c => c.sessionId === sessionId && c.tsStart >= tsStart && c.tsEnd <= tsEnd
    );
  }

  // ===== STT Snippets (텍스트 데이터) =====

  /**
   * STT 스니펫 추가
   * @param {string} sessionId
   * @param {Object} snippet - { tsStart, tsEnd, text, lang }
   * @returns {Object}
   */
  addSttSnippet(sessionId, snippet) {
    const id = `stt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entry = { id, sessionId, ...snippet };
    this.data.sttSnippets.push(entry);
    return entry;
  }

  /**
   * 배치로 STT 스니펫 추가
   * @param {string} sessionId
   * @param {Array} snippets
   * @returns {Array}
   */
  addSttSnippets(sessionId, snippets) {
    return snippets.map(snippet => this.addSttSnippet(sessionId, snippet));
  }

  /**
   * 세션별 STT 스니펫 조회
   * @param {string} sessionId
   * @returns {Array}
   */
  getSttSnippetsBySession(sessionId) {
    return this.data.sttSnippets.filter(s => s.sessionId === sessionId);
  }

  /**
   * 시간 구간별 STT 스니펫 조회
   * @param {string} sessionId
   * @param {number} tsStart
   * @param {number} tsEnd
   * @returns {Array}
   */
  getSttSnippetsByTimeRange(sessionId, tsStart, tsEnd) {
    return this.data.sttSnippets.filter(
      s => s.sessionId === sessionId && s.tsStart >= tsStart && s.tsEnd <= tsEnd
    );
  }

  // ===== Inferences (1분 주기 결합 분석) =====

  /**
   * 추론 결과 저장
   * @param {string} sessionId
   * @param {number} minuteIndex - 1분 주기 인덱스 (0, 1, 2, ...)
   * @param {Object} inference - { facialScore, vadScore, textSentiment, combinedScore, modelVersion }
   * @returns {Object}
   */
  addInference(sessionId, minuteIndex, inference) {
    const id = `inf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entry = { id, sessionId, minuteIndex, ...inference };
    this.data.inferences.push(entry);
    return entry;
  }

  /**
   * 세션별 추론 결과 조회
   * @param {string} sessionId
   * @returns {Array}
   */
  getInferencesBySession(sessionId) {
    return this.data.inferences
      .filter(inf => inf.sessionId === sessionId)
      .sort((a, b) => a.minuteIndex - b.minuteIndex);
  }

  /**
   * 특정 분 추론 결과 조회
   * @param {string} sessionId
   * @param {number} minuteIndex
   * @returns {Object|null}
   */
  getInferenceByMinute(sessionId, minuteIndex) {
    return this.data.inferences.find(
      inf => inf.sessionId === sessionId && inf.minuteIndex === minuteIndex
    ) || null;
  }

  // ===== Reports (세션 종료 리포트) =====

  /**
   * 리포트 저장
   * @param {string} sessionId
   * @param {Object} report - { summary, risks, recommendations, stats }
   * @returns {Object}
   */
  addReport(sessionId, report) {
    const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entry = { id, sessionId, ...report, createdAt: Date.now() };
    this.data.reports.push(entry);
    return entry;
  }

  /**
   * 세션별 최신 리포트 조회
   * @param {string} sessionId
   * @returns {Object|null}
   */
  getLatestReportBySession(sessionId) {
    const reports = this.data.reports.filter(r => r.sessionId === sessionId);
    return reports.length > 0 ? reports[reports.length - 1] : null;
  }

  // ===== Utility Methods =====

  /**
   * 세션 전체 데이터 조회
   * @param {string} sessionId
   * @returns {Object}
   */
  getAllDataBySession(sessionId) {
    return {
      frames: this.getFramesBySession(sessionId),
      audioChunks: this.getAudioChunksBySession(sessionId),
      sttSnippets: this.getSttSnippetsBySession(sessionId),
      inferences: this.getInferencesBySession(sessionId),
      report: this.getLatestReportBySession(sessionId)
    };
  }

  /**
   * 세션 데이터 초기화 (세션 삭제 시)
   * @param {string} sessionId
   */
  clearSessionData(sessionId) {
    this.data.frames = this.data.frames.filter(f => f.sessionId !== sessionId);
    this.data.audioChunks = this.data.audioChunks.filter(c => c.sessionId !== sessionId);
    this.data.sttSnippets = this.data.sttSnippets.filter(s => s.sessionId !== sessionId);
    this.data.inferences = this.data.inferences.filter(inf => inf.sessionId !== sessionId);
    this.data.reports = this.data.reports.filter(r => r.sessionId !== sessionId);
  }

  /**
   * 통계 조회
   * @returns {Object}
   */
  getStats() {
    return {
      totalFrames: this.data.frames.length,
      totalAudioChunks: this.data.audioChunks.length,
      totalSttSnippets: this.data.sttSnippets.length,
      totalInferences: this.data.inferences.length,
      totalReports: this.data.reports.length
    };
  }
}

// Singleton 인스턴스
let instance = null;

module.exports = {
  DataStore,
  getInstance: () => {
    if (!instance) {
      instance = new DataStore();
      console.log('✅ DataStore 싱글톤 인스턴스 초기화');
    }
    return instance;
  }
};
