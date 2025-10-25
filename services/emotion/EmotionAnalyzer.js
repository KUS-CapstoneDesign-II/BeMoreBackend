/**
 * EmotionAnalyzer - 감정 추적 및 통합 분석
 *
 * 기능:
 * 1. 실시간 감정 버퍼링 - 10초마다 감정 데이터 수집
 * 2. 감정 타임라인 - 시간 경과에 따른 감정 변화 추적
 * 3. 감정 통합 분석 - 세션 종료 시 주요 감정과 추이 분석
 * 4. 감정 통계 - 빈도, 강도, 변화 패턴 분석
 */

const EMOTION_LABELS = {
  happy: '행복',
  sad: '슬픔',
  angry: '분노',
  anxious: '불안',
  excited: '흥분',
  neutral: '중립'
};

class EmotionAnalyzer {
  constructor() {
    this.emotionTimeline = [];
    this.emotionStats = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
      excited: 0,
      neutral: 0
    };
    this.totalEmotions = 0;
  }

  /**
   * 감정 데이터 추가
   * @param {string} emotion - 감정 타입 (happy, sad, angry, anxious, excited, neutral)
   * @param {number} timestamp - 감정 분석 시점 (ms)
   * @param {object} metadata - 추가 메타데이터 (frameCount, sttLength 등)
   */
  addEmotion(emotion, timestamp, metadata = {}) {
    // 타입 검증
    if (!EMOTION_LABELS[emotion]) {
      console.warn(`⚠️ Unknown emotion type: ${emotion}, using neutral`);
      emotion = 'neutral';
    }

    const emotionEntry = {
      emotion,
      emotionKo: EMOTION_LABELS[emotion],
      timestamp,
      frameCount: metadata.frameCount || 0,
      sttLength: metadata.sttLength || 0,
      intensity: this._calculateIntensity(emotion, metadata),
      cycleNumber: Math.floor(this.totalEmotions / 10) + 1 // 대략적인 사이클 번호
    };

    this.emotionTimeline.push(emotionEntry);
    this.emotionStats[emotion]++;
    this.totalEmotions++;

    console.log(`📊 [EmotionAnalyzer] Emotion added: ${emotion} (${EMOTION_LABELS[emotion]}) - Total: ${this.totalEmotions}`);

    return emotionEntry;
  }

  /**
   * 감정 강도 계산 (프레임 수와 표정 변화 기반)
   * @private
   */
  _calculateIntensity(emotion, metadata) {
    // 기본 강도: 30 + 프레임 수에 비례 (최대 100)
    const baseIntensity = 30;
    const frameBonus = Math.min((metadata.frameCount || 0) / 10, 40);
    const intensity = Math.min(baseIntensity + frameBonus, 100);

    // 중립은 강도를 낮게
    if (emotion === 'neutral') {
      return Math.max(intensity * 0.6, 20);
    }

    return Math.round(intensity);
  }

  /**
   * 주요 감정 도출 (가장 빈번한 감정)
   */
  getPrimaryEmotion() {
    if (this.totalEmotions === 0) {
      return { emotion: 'neutral', emotionKo: '중립', count: 0, percentage: 0 };
    }

    let maxEmotion = 'neutral';
    let maxCount = 0;

    for (const [emotion, count] of Object.entries(this.emotionStats)) {
      if (count > maxCount) {
        maxCount = count;
        maxEmotion = emotion;
      }
    }

    return {
      emotion: maxEmotion,
      emotionKo: EMOTION_LABELS[maxEmotion],
      count: maxCount,
      percentage: Math.round((maxCount / this.totalEmotions) * 100)
    };
  }

  /**
   * 상위 감정들 (빈도 순)
   */
  getTopEmotions(limit = 3) {
    return Object.entries(this.emotionStats)
      .map(([emotion, count]) => ({
        emotion,
        emotionKo: EMOTION_LABELS[emotion],
        count,
        percentage: Math.round((count / this.totalEmotions) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 감정 변화 추이 분석
   * 초반, 중반, 후반 감정 비교
   */
  getEmotionTrend() {
    if (this.totalEmotions < 3) {
      return {
        beginning: null,
        middle: null,
        end: null,
        trend: '데이터 부족'
      };
    }

    const thirdSize = Math.ceil(this.totalEmotions / 3);

    const beginning = this._getMostFrequentEmotion(0, thirdSize);
    const middle = this._getMostFrequentEmotion(thirdSize, 2 * thirdSize);
    const end = this._getMostFrequentEmotion(2 * thirdSize, this.totalEmotions);

    // 추이 판단
    let trend = '안정적';
    if (beginning.emotion !== end.emotion) {
      const positiveEmotions = ['happy', 'excited'];
      const negativeEmotions = ['sad', 'angry', 'anxious'];

      const beginningPositive = positiveEmotions.includes(beginning.emotion);
      const endPositive = positiveEmotions.includes(end.emotion);

      if (beginningPositive && !endPositive) {
        trend = '부정적으로 변함';
      } else if (!beginningPositive && endPositive) {
        trend = '긍정적으로 개선됨';
      } else {
        trend = '변화함';
      }
    }

    return {
      beginning,
      middle,
      end,
      trend
    };
  }

  /**
   * 특정 범위의 가장 빈번한 감정
   * @private
   */
  _getMostFrequentEmotion(start, end) {
    const slice = this.emotionTimeline.slice(start, end);
    if (slice.length === 0) return { emotion: 'neutral', emotionKo: '중립', count: 0 };

    const counts = {};
    slice.forEach(entry => {
      counts[entry.emotion] = (counts[entry.emotion] || 0) + 1;
    });

    let maxEmotion = 'neutral';
    let maxCount = 0;

    for (const [emotion, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxEmotion = emotion;
      }
    }

    return {
      emotion: maxEmotion,
      emotionKo: EMOTION_LABELS[maxEmotion],
      count: maxCount
    };
  }

  /**
   * 감정 강도 평균 (0-100)
   */
  getAverageIntensity() {
    if (this.emotionTimeline.length === 0) return 0;

    const sum = this.emotionTimeline.reduce((acc, entry) => acc + entry.intensity, 0);
    return Math.round(sum / this.emotionTimeline.length);
  }

  /**
   * 부정적 감정 비율 (슬픔, 분노, 불안)
   */
  getNegativeEmotionRatio() {
    const negativeCount = this.emotionStats.sad + this.emotionStats.angry + this.emotionStats.anxious;
    if (this.totalEmotions === 0) return 0;
    return Math.round((negativeCount / this.totalEmotions) * 100);
  }

  /**
   * 긍정적 감정 비율 (행복, 흥분)
   */
  getPositiveEmotionRatio() {
    const positiveCount = this.emotionStats.happy + this.emotionStats.excited;
    if (this.totalEmotions === 0) return 0;
    return Math.round((positiveCount / this.totalEmotions) * 100);
  }

  /**
   * 전체 감정 분석 결과 (세션 종료 시 사용)
   */
  getSummary() {
    return {
      totalCount: this.totalEmotions,
      timeline: this.emotionTimeline,
      stats: this.emotionStats,
      primaryEmotion: this.getPrimaryEmotion(),
      topEmotions: this.getTopEmotions(3),
      trend: this.getEmotionTrend(),
      averageIntensity: this.getAverageIntensity(),
      positiveRatio: this.getPositiveEmotionRatio(),
      negativeRatio: this.getNegativeEmotionRatio(),
      emotionalState: this._getEmotionalState()
    };
  }

  /**
   * 감정 상태 평가 (한국어 설명)
   * @private
   */
  _getEmotionalState() {
    const positive = this.getPositiveEmotionRatio();
    const negative = this.getNegativeEmotionRatio();

    if (positive > 60) {
      return '긍정적이고 활발한 상태';
    } else if (negative > 60) {
      return '부정적이고 어려운 상태';
    } else if (this.emotionStats.anxious > this.emotionStats.angry && this.emotionStats.anxious > 30) {
      return '불안감이 큰 상태';
    } else if (this.emotionStats.happy === 0 && this.emotionStats.excited === 0) {
      return '긍정적 감정이 부족한 상태';
    } else {
      return '감정적으로 복합적인 상태';
    }
  }

  /**
   * 감정 데이터 초기화
   */
  reset() {
    this.emotionTimeline = [];
    this.emotionStats = {
      happy: 0,
      sad: 0,
      angry: 0,
      anxious: 0,
      excited: 0,
      neutral: 0
    };
    this.totalEmotions = 0;
  }

  /**
   * 감정 데이터로부터 analyzer 복원
   */
  static fromData(emotionsData = []) {
    const analyzer = new EmotionAnalyzer();
    emotionsData.forEach(entry => {
      if (entry.emotion) {
        analyzer.addEmotion(entry.emotion, entry.timestamp, {
          frameCount: entry.frameCount,
          sttLength: entry.sttLength
        });
      }
    });
    return analyzer;
  }
}

module.exports = EmotionAnalyzer;
