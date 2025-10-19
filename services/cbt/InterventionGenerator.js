const CognitiveDistortionDetector = require('./CognitiveDistortionDetector');
const SocraticQuestioner = require('./SocraticQuestioner');
const BehavioralTaskRecommender = require('./BehavioralTaskRecommender');

/**
 * InterventionGenerator - 치료적 개입 생성 및 관리
 *
 * 개입 조건:
 * 1. 심각도 high → 즉시 개입
 * 2. 같은 왜곡 3회 반복 → 개입
 * 3. 다양한 왜곡 동시 발생 (3개 이상) → 개입
 *
 * Phase 3 핵심 기능:
 * - CognitiveDistortionDetector 통합
 * - SocraticQuestioner 통합
 * - BehavioralTaskRecommender 통합
 * - 실시간 개입 판단 및 생성
 */

class InterventionGenerator {
  constructor() {
    this.detector = new CognitiveDistortionDetector();
    this.questioner = new SocraticQuestioner();
    this.taskRecommender = new BehavioralTaskRecommender();

    // 개입 이력
    this.interventionHistory = [];

    // 개입 빈도 제한 (환경변수 기본값: 3)
    this.interventionFrequency = parseInt(process.env.CBT_INTERVENTION_FREQUENCY) || 3;

    console.log('🎯 InterventionGenerator 초기화 완료');
    console.log(`   - 개입 빈도 제한: ${this.interventionFrequency}회/세션`);
  }

  /**
   * STT 텍스트 분석 및 개입 생성
   *
   * @param {string} text - STT 변환된 텍스트
   * @param {Object} context - 컨텍스트 (감정, VAD 등)
   * @returns {Promise<Object>} 분석 결과 및 개입
   */
  async analyze(text, context = {}) {
    // 1. 인지 왜곡 탐지
    const detections = this.detector.detectDistortions(text, context);

    if (detections.length === 0) {
      return {
        hasDistortions: false,
        detections: [],
        needsIntervention: false,
        intervention: null
      };
    }

    // 2. 개입 필요성 판단
    const interventionDecision = this.detector.shouldIntervene(detections);

    // 3. 개입 필요 시 생성
    let intervention = null;
    if (interventionDecision.needsIntervention) {
      intervention = await this._generateIntervention(detections, interventionDecision, context);
    }

    return {
      hasDistortions: true,
      detections,
      needsIntervention: interventionDecision.needsIntervention,
      interventionDecision,
      intervention
    };
  }

  /**
   * 개입 생성
   */
  async _generateIntervention(detections, decision, context) {
    // 주요 왜곡 선택 (심각도 highest 또는 첫 번째)
    const primaryDistortion = this._selectPrimaryDistortion(detections);

    if (!primaryDistortion) {
      console.warn('⚠️ 주요 왜곡을 선택할 수 없습니다');
      return null;
    }

    // 소크라테스식 질문 생성
    const questions = await this.questioner.generateQuestions(primaryDistortion, context);

    // 행동 과제 추천 (난이도: easy 우선)
    const tasks = this.taskRecommender.recommendTasks(primaryDistortion, 'easy');

    const intervention = {
      interventionId: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      distortionType: primaryDistortion.type,
      distortionName: primaryDistortion.name_ko,
      severity: primaryDistortion.severity,
      confidence: primaryDistortion.confidence,
      reason: decision.reason,
      urgency: decision.urgency,
      detectedText: primaryDistortion.text,
      questions: questions,
      tasks: tasks,
      context: context
    };

    // 개입 이력에 추가
    this.interventionHistory.push(intervention);

    console.log(`🎯 치료적 개입 생성: ${intervention.distortionName} (${intervention.urgency})`);
    console.log(`   - 질문: ${questions.length}개`);
    console.log(`   - 과제: ${tasks.length}개`);

    return intervention;
  }

  /**
   * 주요 왜곡 선택 (심각도 우선)
   */
  _selectPrimaryDistortion(detections) {
    // 1. 심각도 high 우선
    const highSeverity = detections.find(d => d.severity === 'high');
    if (highSeverity) return highSeverity;

    // 2. 신뢰도 highest
    const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
    return sorted[0];
  }

  /**
   * 개입 필요성 체크 (빈도 제한 포함)
   */
  canIntervene() {
    const recentInterventions = this._getRecentInterventions(30); // 최근 30분

    if (recentInterventions.length >= this.interventionFrequency) {
      console.log(`⚠️ 개입 빈도 제한 도달 (${recentInterventions.length}/${this.interventionFrequency})`);
      return false;
    }

    return true;
  }

  /**
   * 최근 개입 조회
   */
  _getRecentInterventions(minutes) {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.interventionHistory.filter(i => i.timestamp > cutoffTime);
  }

  /**
   * 개입 이력 조회
   */
  getInterventionHistory() {
    return this.interventionHistory;
  }

  /**
   * 개입 통계
   */
  getStats() {
    const distortionCounts = {};
    this.interventionHistory.forEach(i => {
      distortionCounts[i.distortionType] = (distortionCounts[i.distortionType] || 0) + 1;
    });

    return {
      totalInterventions: this.interventionHistory.length,
      distortionCounts,
      recentInterventions: this._getRecentInterventions(30).length,
      canInterveneNow: this.canIntervene()
    };
  }

  /**
   * 세션 종료 시 이력 초기화
   */
  clearHistory() {
    this.interventionHistory = [];
    this.detector.clearHistory();
    console.log('🗑️ 개입 이력 초기화');
  }

  /**
   * 특정 개입 조회
   */
  getIntervention(interventionId) {
    return this.interventionHistory.find(i => i.interventionId === interventionId);
  }
}

module.exports = InterventionGenerator;
