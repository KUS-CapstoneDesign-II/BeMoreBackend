/**
 * InferenceService - 1분 주기 멀티모달 결합 분석
 *
 * 규칙:
 * - combined = 0.5*facialScore + 0.3*vadScore + 0.2*textSentiment
 * - 1분 단위로 구간 내 평균값 사용
 * - modelVersion = "rules-v1.0"
 */

const { getInstance: getDataStore } = require('./DataStore');
const EmotionAnalyzer = require('../emotion/EmotionAnalyzer');

class InferenceService {
  constructor() {
    this.dataStore = getDataStore();
    this.emotionAnalyzer = new EmotionAnalyzer();
    this.modelVersion = 'rules-v1.0';
    console.log('✅ InferenceService 초기화 완료');
  }

  /**
   * 1분 주기 멀티모달 결합 분석 수행
   *
   * @param {string} sessionId
   * @param {number} minuteIndex - 분 인덱스 (0, 1, 2, ...)
   * @param {number} sessionStartedAt - 세션 시작 타임스탬프
   * @returns {Object} 추론 결과
   */
  inferForMinute(sessionId, minuteIndex, sessionStartedAt) {
    // 1. 시간 범위 계산
    const tsStart = sessionStartedAt + minuteIndex * 60 * 1000;
    const tsEnd = sessionStartedAt + (minuteIndex + 1) * 60 * 1000;

    // 2. 1분 구간 내 데이터 조회
    const frames = this.dataStore.getFramesByTimeRange(sessionId, tsStart, tsEnd);
    const audioChunks = this.dataStore.getAudioChunksByTimeRange(sessionId, tsStart, tsEnd);
    const sttSnippets = this.dataStore.getSttSnippetsByTimeRange(sessionId, tsStart, tsEnd);

    // 3. 각 모달리티별 점수 계산
    const facialScore = this._calculateFacialScore(frames);
    const vadScore = this._calculateVadScore(audioChunks);
    const textSentiment = this._calculateTextSentiment(sttSnippets);

    // 4. 규칙 기반 가중합 계산
    const combinedScore = (
      0.5 * facialScore +
      0.3 * vadScore +
      0.2 * textSentiment
    );

    // 5. 추론 결과 저장
    const inference = this.dataStore.addInference(sessionId, minuteIndex, {
      facialScore: Number(facialScore.toFixed(3)),
      vadScore: Number(vadScore.toFixed(3)),
      textSentiment: Number(textSentiment.toFixed(3)),
      combinedScore: Number(combinedScore.toFixed(3)),
      modelVersion: this.modelVersion,
      dataPoints: {
        frameCount: frames.length,
        audioChunkCount: audioChunks.length,
        sttSnippetCount: sttSnippets.length
      }
    });

    return inference;
  }

  /**
   * 표정 점수 계산 (0 ~ 1)
   * - 프레임 품질 스코어의 평균
   * - 없으면 0.5 (중립)
   */
  _calculateFacialScore(frames) {
    if (frames.length === 0) return 0.5;

    const avgQuality = frames.reduce((sum, f) => sum + (f.qualityScore || 0.5), 0) / frames.length;
    return Math.min(1, Math.max(0, avgQuality));
  }

  /**
   * VAD 음성 점수 계산 (0 ~ 1)
   * - VAD 활성 비율 + RMS 평균으로 종합
   * - 없으면 0.3 (침묵)
   */
  _calculateVadScore(audioChunks) {
    if (audioChunks.length === 0) return 0.3;

    // VAD 활성도: 음성 감지된 청크 비율
    const activeCount = audioChunks.filter(c => c.vad === true || c.vad === 1).length;
    const vadRatio = activeCount / audioChunks.length;

    // RMS 평균: 음성 크기 (0 ~ 1)
    const avgRms = audioChunks.reduce((sum, c) => sum + (c.rms || 0), 0) / audioChunks.length;

    // 가중합: 70% VAD ratio + 30% RMS
    const score = 0.7 * vadRatio + 0.3 * avgRms;
    return Math.min(1, Math.max(0, score));
  }

  /**
   * 텍스트 감정 점수 계산 (0 ~ 1)
   * - 간단한 감정 분류: Positive, Neutral, Negative
   * - Positive: 0.7+, Neutral: 0.4~0.7, Negative: <0.4
   * - 없으면 0.5 (중립)
   */
  _calculateTextSentiment(sttSnippets) {
    if (sttSnippets.length === 0) return 0.5;

    let totalSentiment = 0;
    let count = 0;

    for (const snippet of sttSnippets) {
      if (snippet.text && snippet.text.trim().length > 0) {
        // 간단한 감정 분석 (실제로는 NLP 모델 사용)
        const sentiment = this._simpleSentimentAnalysis(snippet.text);
        totalSentiment += sentiment;
        count++;
      }
    }

    if (count === 0) return 0.5;
    const avgSentiment = totalSentiment / count;
    return Math.min(1, Math.max(0, avgSentiment));
  }

  /**
   * 간단한 감정 분석 (데모용)
   * 실제 프로덕션에서는 NLP 라이브러리 (sentiment, natural, etc) 사용
   */
  _simpleSentimentAnalysis(text) {
    // 긍정 키워드
    const positiveKeywords = [
      '좋', '행복', '즐거', '감사', '신나', '재밌',
      'happy', 'great', 'wonderful', 'excellent', 'love'
    ];
    // 부정 키워드
    const negativeKeywords = [
      '싫', '화나', '불안', '슬픔', '두려', '답답',
      'sad', 'bad', 'terrible', 'hate', 'awful'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const keyword of positiveKeywords) {
      if (text.toLowerCase().includes(keyword)) positiveCount++;
    }
    for (const keyword of negativeKeywords) {
      if (text.toLowerCase().includes(keyword)) negativeCount++;
    }

    if (positiveCount > negativeCount) return 0.7; // 긍정
    if (negativeCount > positiveCount) return 0.3; // 부정
    return 0.5; // 중립
  }

  /**
   * 전체 세션 추론 결과 조회
   */
  getAllInferences(sessionId) {
    return this.dataStore.getInferencesBySession(sessionId);
  }

  /**
   * 세션 통계 생성
   * @param {string} sessionId
   * @returns {Object} 통계 정보
   */
  getSessionStats(sessionId) {
    const inferences = this.getAllInferences(sessionId);

    if (inferences.length === 0) {
      return {
        totalMinutes: 0,
        avgCombinedScore: 0,
        avgFacialScore: 0,
        avgVadScore: 0,
        avgTextSentiment: 0,
        maxCombinedScore: 0,
        minCombinedScore: 0
      };
    }

    const combinedScores = inferences.map(i => i.combinedScore);
    const facialScores = inferences.map(i => i.facialScore);
    const vadScores = inferences.map(i => i.vadScore);
    const textScores = inferences.map(i => i.textSentiment);

    return {
      totalMinutes: inferences.length,
      avgCombinedScore: this._average(combinedScores),
      avgFacialScore: this._average(facialScores),
      avgVadScore: this._average(vadScores),
      avgTextSentiment: this._average(textScores),
      maxCombinedScore: Math.max(...combinedScores),
      minCombinedScore: Math.min(...combinedScores),
      timeline: inferences.map(i => ({
        minute: i.minuteIndex,
        combinedScore: i.combinedScore,
        facialScore: i.facialScore,
        vadScore: i.vadScore,
        textSentiment: i.textSentiment
      }))
    };
  }

  /**
   * 유틸리티: 배열 평균
   */
  _average(arr) {
    if (arr.length === 0) return 0;
    return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3));
  }
}

// Singleton
let instance = null;

module.exports = {
  InferenceService,
  getInstance: () => {
    if (!instance) {
      instance = new InferenceService();
    }
    return instance;
  }
};
