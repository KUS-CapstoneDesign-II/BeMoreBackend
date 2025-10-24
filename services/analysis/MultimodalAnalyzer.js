/**
 * MultimodalAnalyzer - 멀티모달 통합 분석
 *
 * Phase 4 핵심 기능:
 * - 표정 감정 분석 (Gemini)
 * - VAD 음성 활동 분석 (7가지 메트릭)
 * - 심리 지표 분석 (5가지 지표)
 * - CBT 인지 왜곡 탐지 (10가지 패턴)
 * - 멀티모달 종합 평가
 *
 * 통합 분석 결과:
 * - 감정 상태 종합
 * - 심리 위험도
 * - 치료적 권장 사항
 */

const EmotionVADVector = require('./EmotionVADVector');

class MultimodalAnalyzer {
  constructor() {
    console.log('🔬 MultimodalAnalyzer 초기화 완료');
    this.vadVector = new EmotionVADVector();
  }

  /**
   * 세션 데이터 통합 분석
   *
   * @param {Object} sessionData - 세션 전체 데이터
   * @returns {Object} 멀티모달 분석 결과
   */
  analyze(sessionData) {
    const {
      emotions = [],
      vadAnalysisHistory = [],
      interventionGenerator
    } = sessionData;

    // 1. 감정 분석 요약
    const emotionSummary = this._analyzeEmotions(emotions);

    // 2. VAD 메트릭 통합
    const vadSummary = this._analyzeVAD(vadAnalysisHistory);

    // 3. CBT 왜곡 분석
    const cbtSummary = this._analyzeCBT(emotions, interventionGenerator);

    // 4. VAD(Valence–Arousal–Dominance) 벡터 및 타임라인
    const vadVector = this.vadVector.compute({
      emotions,
      vadHistory: vadSummary.totalAnalyses > 0 ? sessionData.vadAnalysisHistory : [],
      cbtSummary
    });
    const vadTimeline = this.vadVector.computeTimeline({
      emotions,
      vadHistory: vadSummary.totalAnalyses > 0 ? sessionData.vadAnalysisHistory : []
    });

    // 5. 멀티모달 종합 평가
    const overallAssessment = this._generateOverallAssessment(
      emotionSummary,
      vadSummary,
      cbtSummary
    );

    // 6. 권장 사항 생성
    const recommendations = this._generateRecommendations(overallAssessment);

    return {
      timestamp: Date.now(),
      sessionId: sessionData.sessionId,
      duration: sessionData.endedAt - sessionData.startedAt,
      emotionSummary,
      vadSummary,
      cbtSummary,
      vadVector,
      vadTimeline,
      overallAssessment,
      recommendations
    };
  }

  /**
   * 감정 분석 요약
   */
  _analyzeEmotions(emotions) {
    // 안전한 배열 처리
    if (!Array.isArray(emotions) || emotions.length === 0) {
      return {
        totalCount: 0,
        distribution: {},
        dominantEmotion: null,
        emotionalVariability: 0,
        timeline: []
      };
    }

    // 감정 분포 계산
    const distribution = {};
    emotions.forEach(e => {
      if (e.emotion) {
        distribution[e.emotion] = (distribution[e.emotion] || 0) + 1;
      }
    });

    // 가장 빈번한 감정
    const dominantEmotion = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])[0];

    // 감정 변동성 (고유 감정 수 / 총 감정 수)
    const uniqueEmotions = Object.keys(distribution).length;
    const emotionalVariability = uniqueEmotions / emotions.length;

    // 타임라인 (10초 단위)
    const timeline = emotions.map(e => ({
      timestamp: e.timestamp,
      emotion: e.emotion,
      frameCount: e.frameCount,
      hasCBT: e.cbtAnalysis?.hasDistortions || false
    }));

    return {
      totalCount: emotions.length,
      distribution,
      dominantEmotion: dominantEmotion ? {
        emotion: dominantEmotion[0],
        count: dominantEmotion[1],
        percentage: Math.round((dominantEmotion[1] / emotions.length) * 100)
      } : null,
      emotionalVariability: Math.round(emotionalVariability * 100) / 100,
      timeline
    };
  }

  /**
   * VAD 메트릭 분석
   */
  _analyzeVAD(vadHistory) {
    // 안전한 배열 처리
    if (!Array.isArray(vadHistory) || vadHistory.length === 0) {
      return {
        totalAnalyses: 0,
        averageMetrics: null,
        psychologicalTrends: null,
        riskProgression: []
      };
    }

    // 평균 메트릭 계산
    const avgMetrics = {
      speechRate: 0,
      silenceRate: 0,
      avgSpeechDuration: 0,
      avgSilenceDuration: 0,
      speechTurnCount: 0,
      interruptionRate: 0,
      energyVariance: 0
    };

    vadHistory.forEach(analysis => {
      const m = analysis.metrics;
      Object.keys(avgMetrics).forEach(key => {
        avgMetrics[key] += m[key] || 0;
      });
    });

    Object.keys(avgMetrics).forEach(key => {
      avgMetrics[key] = Math.round((avgMetrics[key] / vadHistory.length) * 100) / 100;
    });

    // 심리 지표 트렌드
    const psychTrends = {
      prolonged_silence: 0,
      high_silence_rate: 0,
      rapid_speech: 0,
      frequent_interruptions: 0,
      low_speech_energy: 0
    };

    vadHistory.forEach(analysis => {
      const indicators = analysis.psychological?.indicators || {};
      Object.keys(psychTrends).forEach(key => {
        if (indicators[key]?.detected) {
          psychTrends[key]++;
        }
      });
    });

    // 위험도 진행 상황
    const riskProgression = vadHistory.map(analysis => ({
      timestamp: analysis.timestamp,
      riskScore: analysis.psychological?.riskScore || 0,
      riskLevel: analysis.psychological?.riskLevel || 'low'
    }));

    return {
      totalAnalyses: vadHistory.length,
      averageMetrics: avgMetrics,
      psychologicalTrends: psychTrends,
      riskProgression
    };
  }

  /**
   * CBT 왜곡 분석
   */
  _analyzeCBT(emotions, interventionGenerator) {
    if (!interventionGenerator) {
      return {
        totalDistortions: 0,
        distortionDistribution: {},
        totalInterventions: 0,
        interventionHistory: []
      };
    }

    // 감정 데이터에서 CBT 분석 추출
    const allDistortions = [];
    // 안전한 배열 처리
    if (Array.isArray(emotions)) {
      emotions.forEach(e => {
        if (e && e.cbtAnalysis?.detections) {
          allDistortions.push(...e.cbtAnalysis.detections);
        }
      });
    }

    // 왜곡 분포
    const distortionDistribution = {};
    allDistortions.forEach(d => {
      distortionDistribution[d.type] = (distortionDistribution[d.type] || 0) + 1;
    });

    // 개입 이력
    const interventionHistory = interventionGenerator.getInterventionHistory();

    // 가장 빈번한 왜곡
    const mostCommon = Object.entries(distortionDistribution || {})
      .sort((a, b) => b[1] - a[1])[0];

    return {
      totalDistortions: allDistortions.length,
      distortionDistribution,
      mostCommonDistortion: mostCommon ? {
        type: mostCommon[0],
        count: mostCommon[1]
      } : null,
      totalInterventions: interventionHistory.length,
      interventionHistory: interventionHistory.map(i => ({
        timestamp: i.timestamp,
        distortionType: i.distortionType,
        distortionName: i.distortionName,
        severity: i.severity,
        urgency: i.urgency,
        questionCount: i.questions.length,
        taskCount: i.tasks.length
      }))
    };
  }

  /**
   * 멀티모달 종합 평가
   */
  _generateOverallAssessment(emotionSummary, vadSummary, cbtSummary) {
    // 심리 위험도 계산 (0-100)
    let riskScore = 0;

    // 1. 부정적 감정 비중 (30점)
    const negativeEmotions = ['슬픔', 'sadness', '불안', 'anxiety', '분노', 'anger', '두려움', 'fear'];
    const negativeCount = Object.entries(emotionSummary?.distribution || {})
      .filter(([emotion]) => emotion && typeof emotion === 'string' && negativeEmotions.some(ne => emotion.includes(ne)))
      .reduce((sum, [, count]) => sum + count, 0);
    const negativeRatio = emotionSummary.totalCount > 0
      ? negativeCount / emotionSummary.totalCount
      : 0;
    riskScore += Math.round(negativeRatio * 30);

    // 2. VAD 심리 지표 (40점)
    if (vadSummary.totalAnalyses > 0) {
      const avgRiskScore = vadSummary.riskProgression.reduce(
        (sum, r) => sum + r.riskScore, 0
      ) / vadSummary.riskProgression.length;
      riskScore += Math.round(avgRiskScore * 0.4);
    }

    // 3. CBT 왜곡 빈도 (30점)
    if (cbtSummary?.totalDistortions > 0 && emotionSummary?.totalCount > 0) {
      const distortionDensity = Math.min(
        cbtSummary.totalDistortions / emotionSummary.totalCount,
        1.0
      );
      riskScore += Math.round(distortionDensity * 30);
    }

    // 위험도 레벨 분류
    let riskLevel;
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    else riskLevel = 'low';

    // 주요 관찰 사항
    const keyObservations = [];

    if (emotionSummary.dominantEmotion) {
      keyObservations.push(
        `가장 빈번한 감정: ${emotionSummary.dominantEmotion.emotion} (${emotionSummary.dominantEmotion.percentage}%)`
      );
    }

    if (vadSummary.averageMetrics) {
      if (vadSummary.averageMetrics.silenceRate > 60) {
        keyObservations.push(`높은 침묵 비율: ${vadSummary.averageMetrics.silenceRate}%`);
      }
      if (vadSummary.averageMetrics.speechRate > 70) {
        keyObservations.push(`빠른 말하기: ${vadSummary.averageMetrics.speechRate}%`);
      }
    }

    if (cbtSummary.mostCommonDistortion) {
      keyObservations.push(
        `가장 빈번한 인지 왜곡: ${cbtSummary.mostCommonDistortion.type} (${cbtSummary.mostCommonDistortion.count}회)`
      );
    }

    return {
      riskScore,
      riskLevel,
      keyObservations,
      emotionalState: this._classifyEmotionalState(emotionSummary),
      communicationPattern: this._classifyCommunicationPattern(vadSummary),
      cognitivePattern: this._classifyCognitivePattern(cbtSummary)
    };
  }

  /**
   * 감정 상태 분류
   */
  _classifyEmotionalState(emotionSummary) {
    if (!emotionSummary.dominantEmotion) return 'unknown';

    const emotion = emotionSummary.dominantEmotion.emotion.toLowerCase();
    const percentage = emotionSummary.dominantEmotion.percentage;

    if (percentage >= 60) {
      if (emotion.includes('행복') || emotion.includes('happy')) return 'positive_stable';
      if (emotion.includes('슬픔') || emotion.includes('sad')) return 'depressive';
      if (emotion.includes('불안') || emotion.includes('anxi')) return 'anxious';
      if (emotion.includes('분노') || emotion.includes('anger')) return 'irritable';
    }

    if (emotionSummary.emotionalVariability > 0.5) return 'emotionally_unstable';

    return 'neutral';
  }

  /**
   * 의사소통 패턴 분류
   */
  _classifyCommunicationPattern(vadSummary) {
    if (!vadSummary.averageMetrics) return 'unknown';

    const m = vadSummary.averageMetrics;

    if (m.silenceRate > 60) return 'withdrawn';
    if (m.speechRate > 70) return 'pressured_speech';
    if (m.interruptionRate > 40) return 'fragmented';
    if (m.energyVariance < 0.05) return 'monotone';

    return 'normal';
  }

  /**
   * 인지 패턴 분류
   */
  _classifyCognitivePattern(cbtSummary) {
    if (!cbtSummary || cbtSummary.totalDistortions === 0) return 'healthy';

    const density = cbtSummary.totalDistortions / 10; // 10초 단위 기준

    if (density >= 2) return 'severe_distortion';
    if (density >= 1) return 'moderate_distortion';
    if (density >= 0.5) return 'mild_distortion';

    return 'occasional_distortion';
  }

  /**
   * 권장 사항 생성
   */
  _generateRecommendations(assessment) {
    const recommendations = [];

    // 위험도 기반 권장사항
    if (assessment.riskLevel === 'critical' || assessment.riskLevel === 'high') {
      recommendations.push({
        priority: 'high',
        category: 'intervention',
        title: '전문가 상담 권장',
        description: '심리 위험도가 높습니다. 전문 상담사와의 심화 상담을 권장합니다.'
      });
    }

    // 감정 상태 기반
    if (assessment.emotionalState === 'depressive') {
      recommendations.push({
        priority: 'high',
        category: 'emotion',
        title: '우울 증상 모니터링',
        description: '지속적인 슬픔이 관찰됩니다. 일상 활동 증가와 긍정적 경험 추구를 권장합니다.'
      });
    }

    if (assessment.emotionalState === 'anxious') {
      recommendations.push({
        priority: 'high',
        category: 'emotion',
        title: '불안 완화 기법',
        description: '호흡법, 마인드풀니스 등 불안 완화 기법 실천을 권장합니다.'
      });
    }

    // 의사소통 패턴 기반
    if (assessment.communicationPattern === 'withdrawn') {
      recommendations.push({
        priority: 'medium',
        category: 'communication',
        title: '표현 증가 연습',
        description: '생각과 감정을 더 많이 표현하는 연습이 필요합니다.'
      });
    }

    if (assessment.communicationPattern === 'pressured_speech') {
      recommendations.push({
        priority: 'medium',
        category: 'communication',
        title: '말하기 속도 조절',
        description: '천천히 말하기 연습을 통해 생각을 정리하는 시간을 가지세요.'
      });
    }

    // 인지 패턴 기반
    if (assessment.cognitivePattern && assessment.cognitivePattern.includes('distortion')) {
      recommendations.push({
        priority: 'high',
        category: 'cbt',
        title: 'CBT 기법 실천',
        description: '인지 왜곡 개선을 위해 제공된 소크라테스식 질문과 행동 과제를 실천하세요.'
      });
    }

    // 일반 권장사항
    recommendations.push({
      priority: 'low',
      category: 'general',
      title: '정기적 모니터링',
      description: '꾸준한 자기 관찰과 기록을 통해 변화를 추적하세요.'
    });

    return recommendations;
  }
}

module.exports = MultimodalAnalyzer;
