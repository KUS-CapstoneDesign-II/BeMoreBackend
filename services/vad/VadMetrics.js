const stats = require('simple-statistics');

/**
 * VadMetrics - VAD 데이터 기반 음성 특성 지표 계산
 *
 * 7가지 핵심 지표:
 * 1. speechRate - 말하기 속도 (단위시간당 음성 비율)
 * 2. silenceRate - 침묵 비율
 * 3. avgSpeechDuration - 평균 음성 지속 시간
 * 4. avgSilenceDuration - 평균 침묵 지속 시간
 * 5. speechTurnCount - 발화 횟수 (음성 구간 개수)
 * 6. interruptionRate - 중단 빈도 (짧은 음성 구간 비율)
 * 7. energyVariance - 음성 에너지 변동성
 *
 * 심리 상담 활용:
 * - 우울증: speechRate ↓, silenceRate ↑, avgSilenceDuration ↑
 * - 불안: interruptionRate ↑, energyVariance ↑
 * - 분노: speechRate ↑, energyVariance ↑
 */

class VadMetrics {
  constructor() {
    this.reset();
  }

  /**
   * 메트릭 초기화
   */
  reset() {
    this.vadEvents = []; // { timestamp, isSpeech, duration, energy }
    this.speechSegments = []; // 음성 구간들
    this.silenceSegments = []; // 침묵 구간들
    this.startTime = Date.now();
  }

  /**
   * VAD 이벤트 추가
   *
   * @param {Object} event - VAD 이벤트
   * @param {number} event.timestamp - 타임스탬프 (ms)
   * @param {boolean} event.isSpeech - 음성 여부
   * @param {number} event.duration - 지속 시간 (ms)
   * @param {number} [event.energy] - 오디오 에너지 (옵션)
   */
  addEvent(event) {
    this.vadEvents.push({
      timestamp: event.timestamp,
      isSpeech: event.isSpeech,
      duration: event.duration || 0,
      energy: event.energy || 0
    });

    // 음성/침묵 구간 분류
    if (event.isSpeech) {
      this.speechSegments.push({
        timestamp: event.timestamp,
        duration: event.duration,
        energy: event.energy
      });
    } else {
      this.silenceSegments.push({
        timestamp: event.timestamp,
        duration: event.duration
      });
    }
  }

  /**
   * 7가지 VAD 메트릭 계산
   *
   * @returns {Object} 계산된 메트릭
   */
  calculate() {
    const totalDuration = Date.now() - this.startTime;

    if (this.vadEvents.length === 0) {
      return this._getEmptyMetrics();
    }

    // 1. speechRate - 말하기 속도 (%)
    const totalSpeechDuration = this.speechSegments.reduce((sum, seg) => sum + seg.duration, 0);
    const speechRate = totalDuration > 0 ? (totalSpeechDuration / totalDuration) * 100 : 0;

    // 2. silenceRate - 침묵 비율 (%)
    const totalSilenceDuration = this.silenceSegments.reduce((sum, seg) => sum + seg.duration, 0);
    const silenceRate = totalDuration > 0 ? (totalSilenceDuration / totalDuration) * 100 : 0;

    // 3. avgSpeechDuration - 평균 음성 지속 시간 (ms)
    const avgSpeechDuration = this.speechSegments.length > 0
      ? totalSpeechDuration / this.speechSegments.length
      : 0;

    // 4. avgSilenceDuration - 평균 침묵 지속 시간 (ms)
    const avgSilenceDuration = this.silenceSegments.length > 0
      ? totalSilenceDuration / this.silenceSegments.length
      : 0;

    // 5. speechTurnCount - 발화 횟수
    const speechTurnCount = this.speechSegments.length;

    // 6. interruptionRate - 중단 빈도
    // 500ms 이하의 짧은 음성 구간을 "중단"으로 정의
    const shortSpeechCount = this.speechSegments.filter(seg => seg.duration < 500).length;
    const interruptionRate = speechTurnCount > 0
      ? (shortSpeechCount / speechTurnCount) * 100
      : 0;

    // 7. energyVariance - 음성 에너지 변동성
    const energyValues = this.speechSegments
      .map(seg => seg.energy)
      .filter(e => e > 0);

    const energyVariance = energyValues.length > 1
      ? stats.variance(energyValues)
      : 0;

    return {
      // 기본 비율
      speechRate: Math.round(speechRate * 100) / 100, // 소수점 2자리
      silenceRate: Math.round(silenceRate * 100) / 100,

      // 지속 시간 (ms)
      avgSpeechDuration: Math.round(avgSpeechDuration),
      avgSilenceDuration: Math.round(avgSilenceDuration),

      // 횟수 및 빈도
      speechTurnCount,
      interruptionRate: Math.round(interruptionRate * 100) / 100,

      // 에너지
      energyVariance: Math.round(energyVariance * 100) / 100,

      // 메타데이터
      totalDuration: Math.round(totalDuration),
      totalSpeechDuration: Math.round(totalSpeechDuration),
      totalSilenceDuration: Math.round(totalSilenceDuration),
      eventCount: this.vadEvents.length
    };
  }

  /**
   * 빈 메트릭 반환 (데이터 없을 때)
   */
  _getEmptyMetrics() {
    return {
      speechRate: 0,
      silenceRate: 0,
      avgSpeechDuration: 0,
      avgSilenceDuration: 0,
      speechTurnCount: 0,
      interruptionRate: 0,
      energyVariance: 0,
      totalDuration: 0,
      totalSpeechDuration: 0,
      totalSilenceDuration: 0,
      eventCount: 0
    };
  }

  /**
   * 시계열 데이터 반환 (차트 시각화용)
   *
   * @param {number} intervalMs - 시간 간격 (ms), 기본 10000 (10초)
   * @returns {Array} 시계열 데이터 배열
   */
  getTimeSeries(intervalMs = 10000) {
    if (this.vadEvents.length === 0) return [];

    const timeSeries = [];
    const startTime = this.startTime;
    const endTime = Date.now();
    const intervals = Math.ceil((endTime - startTime) / intervalMs);

    for (let i = 0; i < intervals; i++) {
      const windowStart = startTime + (i * intervalMs);
      const windowEnd = windowStart + intervalMs;

      // 해당 구간의 이벤트만 필터링
      const windowEvents = this.vadEvents.filter(
        e => e.timestamp >= windowStart && e.timestamp < windowEnd
      );

      if (windowEvents.length === 0) {
        timeSeries.push({
          timestamp: windowStart,
          speechRate: 0,
          silenceRate: 0,
          speechCount: 0
        });
        continue;
      }

      // 구간별 메트릭 계산
      const speechEvents = windowEvents.filter(e => e.isSpeech);
      const silenceEvents = windowEvents.filter(e => !e.isSpeech);

      const speechDuration = speechEvents.reduce((sum, e) => sum + e.duration, 0);
      const silenceDuration = silenceEvents.reduce((sum, e) => sum + e.duration, 0);
      const totalDuration = speechDuration + silenceDuration;

      timeSeries.push({
        timestamp: windowStart,
        speechRate: totalDuration > 0 ? (speechDuration / totalDuration) * 100 : 0,
        silenceRate: totalDuration > 0 ? (silenceDuration / totalDuration) * 100 : 0,
        speechCount: speechEvents.length
      });
    }

    return timeSeries;
  }

  /**
   * 현재 메트릭 요약 (로깅용)
   */
  getSummary() {
    const metrics = this.calculate();

    return {
      summary: `Speech: ${metrics.speechRate.toFixed(1)}% | Silence: ${metrics.silenceRate.toFixed(1)}% | Turns: ${metrics.speechTurnCount}`,
      metrics
    };
  }

  /**
   * 메트릭 상태 조회
   */
  getStatus() {
    return {
      eventCount: this.vadEvents.length,
      speechSegments: this.speechSegments.length,
      silenceSegments: this.silenceSegments.length,
      duration: Date.now() - this.startTime
    };
  }
}

module.exports = VadMetrics;
