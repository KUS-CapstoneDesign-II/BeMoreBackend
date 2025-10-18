/**
 * PsychologicalIndicators - VAD 메트릭 기반 심리 지표 추출
 *
 * 5가지 심리 지표:
 * 1. prolonged_silence - 장시간 침묵 (우울증, 사고 정지)
 * 2. high_silence_rate - 높은 침묵 비율 (회피, 무기력)
 * 3. rapid_speech - 빠른 말하기 (불안, 조증)
 * 4. frequent_interruptions - 잦은 중단 (산만함, 불안)
 * 5. low_speech_energy - 낮은 음성 에너지 (우울, 피로)
 *
 * 임상 활용:
 * - 실시간 위기 감지 (자살 위험, 극심한 불안)
 * - 치료 효과 모니터링 (세션 간 변화 추적)
 * - 상담사 개입 타이밍 추천
 */

class PsychologicalIndicators {
  constructor(thresholds = {}) {
    // 임계값 설정 (심리 상담 전문가 자문 기반)
    this.thresholds = {
      // 1. prolonged_silence - 장시간 침묵 (ms)
      prolongedSilenceThreshold: thresholds.prolongedSilenceThreshold || 5000, // 5초 이상

      // 2. high_silence_rate - 높은 침묵 비율 (%)
      highSilenceRateThreshold: thresholds.highSilenceRateThreshold || 60, // 60% 이상

      // 3. rapid_speech - 빠른 말하기 (%)
      rapidSpeechThreshold: thresholds.rapidSpeechThreshold || 70, // 70% 이상

      // 4. frequent_interruptions - 잦은 중단 (%)
      interruptionRateThreshold: thresholds.interruptionRateThreshold || 40, // 40% 이상

      // 5. low_speech_energy - 낮은 음성 에너지
      lowEnergyThreshold: thresholds.lowEnergyThreshold || 0.05 // 0.05 이하
    };

    console.log('🧠 PsychologicalIndicators 초기화 완료');
    console.log('   임계값:', this.thresholds);
  }

  /**
   * VAD 메트릭에서 심리 지표 추출
   *
   * @param {Object} vadMetrics - VadMetrics.calculate() 결과
   * @returns {Object} 심리 지표 및 위험도
   */
  analyze(vadMetrics) {
    if (!vadMetrics || vadMetrics.eventCount === 0) {
      return this._getEmptyIndicators();
    }

    const indicators = {};
    const alerts = [];

    // 1. prolonged_silence - 장시간 침묵
    indicators.prolonged_silence = this._detectProlongedSilence(vadMetrics);
    if (indicators.prolonged_silence.detected) {
      alerts.push({
        type: 'prolonged_silence',
        severity: indicators.prolonged_silence.severity,
        message: `${indicators.prolonged_silence.duration}ms 침묵 감지 (${indicators.prolonged_silence.interpretation})`
      });
    }

    // 2. high_silence_rate - 높은 침묵 비율
    indicators.high_silence_rate = this._detectHighSilenceRate(vadMetrics);
    if (indicators.high_silence_rate.detected) {
      alerts.push({
        type: 'high_silence_rate',
        severity: indicators.high_silence_rate.severity,
        message: `침묵 비율 ${indicators.high_silence_rate.rate}% (${indicators.high_silence_rate.interpretation})`
      });
    }

    // 3. rapid_speech - 빠른 말하기
    indicators.rapid_speech = this._detectRapidSpeech(vadMetrics);
    if (indicators.rapid_speech.detected) {
      alerts.push({
        type: 'rapid_speech',
        severity: indicators.rapid_speech.severity,
        message: `빠른 말하기 ${indicators.rapid_speech.rate}% (${indicators.rapid_speech.interpretation})`
      });
    }

    // 4. frequent_interruptions - 잦은 중단
    indicators.frequent_interruptions = this._detectFrequentInterruptions(vadMetrics);
    if (indicators.frequent_interruptions.detected) {
      alerts.push({
        type: 'frequent_interruptions',
        severity: indicators.frequent_interruptions.severity,
        message: `중단 빈도 ${indicators.frequent_interruptions.rate}% (${indicators.frequent_interruptions.interpretation})`
      });
    }

    // 5. low_speech_energy - 낮은 음성 에너지
    indicators.low_speech_energy = this._detectLowEnergy(vadMetrics);
    if (indicators.low_speech_energy.detected) {
      alerts.push({
        type: 'low_speech_energy',
        severity: indicators.low_speech_energy.severity,
        message: `낮은 음성 에너지 (${indicators.low_speech_energy.interpretation})`
      });
    }

    // 종합 위험도 계산 (0-100)
    const riskScore = this._calculateRiskScore(indicators);

    return {
      indicators,
      alerts,
      riskScore,
      riskLevel: this._getRiskLevel(riskScore),
      timestamp: Date.now()
    };
  }

  /**
   * 1. 장시간 침묵 감지
   */
  _detectProlongedSilence(vadMetrics) {
    const { avgSilenceDuration } = vadMetrics;
    const threshold = this.thresholds.prolongedSilenceThreshold;

    const detected = avgSilenceDuration > threshold;
    const severity = detected
      ? (avgSilenceDuration > threshold * 2 ? 'high' : 'medium')
      : 'low';

    let interpretation = '';
    if (avgSilenceDuration > threshold * 2) {
      interpretation = '심각한 사고 정지 또는 우울 증상';
    } else if (avgSilenceDuration > threshold) {
      interpretation = '중간 수준 침묵, 우울 또는 숙고';
    } else {
      interpretation = '정상 범위';
    }

    return {
      detected,
      duration: avgSilenceDuration,
      threshold,
      severity,
      interpretation
    };
  }

  /**
   * 2. 높은 침묵 비율 감지
   */
  _detectHighSilenceRate(vadMetrics) {
    const { silenceRate } = vadMetrics;
    const threshold = this.thresholds.highSilenceRateThreshold;

    const detected = silenceRate > threshold;
    const severity = detected
      ? (silenceRate > threshold * 1.2 ? 'high' : 'medium')
      : 'low';

    let interpretation = '';
    if (silenceRate > threshold * 1.2) {
      interpretation = '심각한 회피 또는 무기력';
    } else if (silenceRate > threshold) {
      interpretation = '높은 침묵, 회피 또는 내향성';
    } else {
      interpretation = '정상 범위';
    }

    return {
      detected,
      rate: silenceRate,
      threshold,
      severity,
      interpretation
    };
  }

  /**
   * 3. 빠른 말하기 감지
   */
  _detectRapidSpeech(vadMetrics) {
    const { speechRate } = vadMetrics;
    const threshold = this.thresholds.rapidSpeechThreshold;

    const detected = speechRate > threshold;
    const severity = detected
      ? (speechRate > threshold * 1.2 ? 'high' : 'medium')
      : 'low';

    let interpretation = '';
    if (speechRate > threshold * 1.2) {
      interpretation = '심각한 불안 또는 조증 의심';
    } else if (speechRate > threshold) {
      interpretation = '빠른 말하기, 불안 또는 흥분';
    } else {
      interpretation = '정상 범위';
    }

    return {
      detected,
      rate: speechRate,
      threshold,
      severity,
      interpretation
    };
  }

  /**
   * 4. 잦은 중단 감지
   */
  _detectFrequentInterruptions(vadMetrics) {
    const { interruptionRate } = vadMetrics;
    const threshold = this.thresholds.interruptionRateThreshold;

    const detected = interruptionRate > threshold;
    const severity = detected
      ? (interruptionRate > threshold * 1.5 ? 'high' : 'medium')
      : 'low';

    let interpretation = '';
    if (interruptionRate > threshold * 1.5) {
      interpretation = '심각한 산만함 또는 불안';
    } else if (interruptionRate > threshold) {
      interpretation = '잦은 중단, 불안 또는 ADHD 경향';
    } else {
      interpretation = '정상 범위';
    }

    return {
      detected,
      rate: interruptionRate,
      threshold,
      severity,
      interpretation
    };
  }

  /**
   * 5. 낮은 음성 에너지 감지
   */
  _detectLowEnergy(vadMetrics) {
    const { energyVariance } = vadMetrics;
    const threshold = this.thresholds.lowEnergyThreshold;

    // energyVariance가 낮으면 음성이 단조롭고 에너지가 낮음
    const detected = energyVariance < threshold;
    const severity = detected
      ? (energyVariance < threshold * 0.5 ? 'high' : 'medium')
      : 'low';

    let interpretation = '';
    if (energyVariance < threshold * 0.5) {
      interpretation = '심각한 우울 또는 피로';
    } else if (energyVariance < threshold) {
      interpretation = '낮은 에너지, 우울 또는 무기력';
    } else {
      interpretation = '정상 범위';
    }

    return {
      detected,
      energyVariance,
      threshold,
      severity,
      interpretation
    };
  }

  /**
   * 종합 위험도 계산 (0-100)
   */
  _calculateRiskScore(indicators) {
    let score = 0;

    // 각 지표의 가중치
    const weights = {
      prolonged_silence: 25,
      high_silence_rate: 20,
      rapid_speech: 20,
      frequent_interruptions: 15,
      low_speech_energy: 20
    };

    for (const [key, indicator] of Object.entries(indicators)) {
      if (indicator.detected) {
        const weight = weights[key] || 0;
        const multiplier = indicator.severity === 'high' ? 1.0 : 0.6;
        score += weight * multiplier;
      }
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * 위험도 레벨 분류
   */
  _getRiskLevel(riskScore) {
    if (riskScore >= 70) return 'critical'; // 즉시 개입 필요
    if (riskScore >= 50) return 'high'; // 주의 깊은 모니터링
    if (riskScore >= 30) return 'medium'; // 경과 관찰
    return 'low'; // 정상 범위
  }

  /**
   * 빈 지표 반환 (데이터 없을 때)
   */
  _getEmptyIndicators() {
    return {
      indicators: {
        prolonged_silence: { detected: false, severity: 'low' },
        high_silence_rate: { detected: false, severity: 'low' },
        rapid_speech: { detected: false, severity: 'low' },
        frequent_interruptions: { detected: false, severity: 'low' },
        low_speech_energy: { detected: false, severity: 'low' }
      },
      alerts: [],
      riskScore: 0,
      riskLevel: 'low',
      timestamp: Date.now()
    };
  }

  /**
   * 임계값 동적 조정
   */
  updateThresholds(newThresholds) {
    console.log('🔧 PsychologicalIndicators 임계값 업데이트:', newThresholds);
    Object.assign(this.thresholds, newThresholds);
  }

  /**
   * 현재 설정 조회
   */
  getConfig() {
    return {
      thresholds: this.thresholds
    };
  }
}

module.exports = PsychologicalIndicators;
