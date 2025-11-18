const fs = require('fs');
const path = require('path');

/**
 * CognitiveDistortionDetector - 인지 왜곡 탐지 시스템
 *
 * 10가지 인지 왜곡 패턴:
 * 1. catastrophizing - 파국화
 * 2. all-or-nothing - 흑백논리
 * 3. overgeneralization - 과잉일반화
 * 4. mental-filter - 정신적 여과
 * 5. disqualifying-positive - 긍정 부인
 * 6. jumping-to-conclusions - 성급한 결론
 * 7. magnification - 확대/축소
 * 8. emotional-reasoning - 감정적 추론
 * 9. should-statements - 당위적 사고
 * 10. labeling - 낙인찍기
 *
 * Phase 3 핵심 기능:
 * - 키워드 + 정규표현식 매칭
 * - 심각도 평가 (high/medium/low)
 * - 신뢰도 점수 (0.0 ~ 1.0)
 */

class CognitiveDistortionDetector {
  constructor(threshold = 0.6) {
    this.patterns = this._loadPatterns();
    this.threshold = threshold;
    this.detectionHistory = []; // 왜곡 탐지 이력 (개입 판단용)

    console.log('🧠 CognitiveDistortionDetector 초기화 완료');
    console.log(`   - 패턴 수: ${this.patterns.length}개`);
    console.log(`   - 탐지 임계값: ${this.threshold}`);
  }

  /**
   * 패턴 파일 로딩
   */
  _loadPatterns() {
    const patternsDir = path.join(__dirname, 'patterns');
    const patterns = [];

    const files = [
      'catastrophizing.json',
      'all-or-nothing.json',
      'overgeneralization.json',
      'mental-filter.json',
      'disqualifying-positive.json',
      'jumping-to-conclusions.json',
      'magnification.json',
      'emotional-reasoning.json',
      'should-statements.json',
      'labeling.json'
    ];

    files.forEach(file => {
      try {
        const filePath = path.join(patternsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        patterns.push(data);
      } catch (error) {
        console.error(`❌ 패턴 파일 로딩 실패 (${file}):`, error.message);
      }
    });

    return patterns;
  }

  /**
   * STT 텍스트에서 인지 왜곡 탐지
   *
   * @param {string} text - STT 변환된 텍스트
   * @param {Object} context - 추가 컨텍스트 (감정, VAD 메트릭 등)
   * @returns {Array} 탐지된 왜곡 목록
   */
  detectDistortions(text, context = {}) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const detections = [];
    const timestamp = Date.now();

    this.patterns.forEach(pattern => {
      const matches = this._matchPattern(text, pattern);

      if (matches.length > 0) {
        const confidence = this._calculateConfidence(matches);

        // 임계값 이상만 탐지로 인정
        if (confidence >= this.threshold) {
          const detection = {
            type: pattern.type,
            name_ko: pattern.name_ko,
            name_en: pattern.name_en,
            description: pattern.description,
            matches: matches,
            severity: this._calculateSeverity(matches),
            confidence: Math.round(confidence * 100) / 100,
            text: text,
            timestamp: timestamp,
            context: context
          };

          detections.push(detection);

          // 이력에 추가
          this.detectionHistory.push({
            type: pattern.type,
            timestamp: timestamp,
            severity: detection.severity
          });
        }
      }
    });

    // 탐지 결과 로깅
    if (detections.length > 0) {
      console.log(`🔍 인지 왜곡 탐지: ${detections.length}개`);
      detections.forEach(d => {
        console.log(`   - ${d.name_ko} (${d.severity}, 신뢰도: ${d.confidence})`);
      });
    }

    return detections;
  }

  /**
   * 패턴 매칭 (키워드 + 정규표현식)
   */
  _matchPattern(text, pattern) {
    const matches = [];

    // 1. 키워드 매칭
    const keywordMatches = pattern.keywords.filter(kw => text.includes(kw));
    if (keywordMatches.length > 0) {
      matches.push({
        type: 'keyword',
        matched: keywordMatches,
        count: keywordMatches.length,
        confidence: 0.5
      });
    }

    // 2. 정규표현식 매칭
    pattern.patterns.forEach(p => {
      try {
        const regex = new RegExp(p.regex, 'gi');
        const regexMatches = text.match(regex);

        if (regexMatches && regexMatches.length > 0) {
          matches.push({
            type: 'pattern',
            matched: regexMatches,
            severity: p.severity,
            example: p.example,
            confidence: 0.8
          });
        }
      } catch (error) {
        console.error(`❌ 정규표현식 오류 (${p.regex}):`, error.message);
      }
    });

    return matches;
  }

  /**
   * 신뢰도 계산
   * - 키워드: 0.5
   * - 정규표현식: 0.8
   * - 여러 증거: 가중 평균
   */
  _calculateConfidence(matches) {
    if (matches.length === 0) return 0;

    const totalConfidence = matches.reduce((sum, m) => sum + m.confidence, 0);
    const avgConfidence = totalConfidence / matches.length;

    // 여러 증거가 있으면 신뢰도 상승
    const evidenceBonus = Math.min(matches.length * 0.1, 0.3);

    return Math.min(avgConfidence + evidenceBonus, 1.0);
  }

  /**
   * 심각도 계산
   */
  _calculateSeverity(matches) {
    const patternMatches = matches.filter(m => m.type === 'pattern');

    if (patternMatches.some(m => m.severity === 'high')) return 'high';
    if (patternMatches.some(m => m.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * 개입 필요성 판단
   *
   * 개입 조건:
   * 1. 심각도 high → 즉시 개입
   * 2. 같은 왜곡 3회 반복 → 개입
   * 3. 다양한 왜곡 동시 발생 (3개 이상) → 개입
   *
   * @param {Array} currentDetections - 현재 탐지된 왜곡들
   * @returns {Object} 개입 필요성 및 이유
   */
  shouldIntervene(currentDetections) {
    // 조건 1: 심각도 high
    const highSeverityCount = currentDetections.filter(d => d.severity === 'high').length;
    if (highSeverityCount > 0) {
      return {
        needsIntervention: true,
        reason: 'high_severity',
        message: `심각도 높은 인지 왜곡 ${highSeverityCount}개 탐지`,
        urgency: 'immediate'
      };
    }

    // 조건 2: 같은 왜곡 3회 반복 (최근 10분)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const recentHistory = this.detectionHistory.filter(h => h.timestamp > tenMinutesAgo);

    const distortionCounts = {};
    recentHistory.forEach(h => {
      distortionCounts[h.type] = (distortionCounts[h.type] || 0) + 1;
    });

    const repeatedDistortion = Object.entries(distortionCounts).find(([type, count]) => count >= 3);
    if (repeatedDistortion) {
      const [type, count] = repeatedDistortion;
      return {
        needsIntervention: true,
        reason: 'repeated_distortion',
        message: `같은 왜곡(${type}) ${count}회 반복 탐지`,
        urgency: 'soon',
        distortionType: type
      };
    }

    // 조건 3: 다양한 왜곡 동시 발생 (3개 이상)
    const uniqueTypes = new Set(currentDetections.map(d => d.type));
    if (uniqueTypes.size >= 3) {
      return {
        needsIntervention: true,
        reason: 'multiple_distortions',
        message: `${uniqueTypes.size}가지 다른 왜곡 동시 발생`,
        urgency: 'soon',
        distortionTypes: Array.from(uniqueTypes)
      };
    }

    return {
      needsIntervention: false,
      reason: 'normal',
      message: '정상 범위',
      urgency: 'routine'
    };
  }

  /**
   * 이력 초기화 (세션 종료 시)
   */
  clearHistory() {
    this.detectionHistory = [];
    console.log('🗑️ 인지 왜곡 탐지 이력 초기화');
  }

  /**
   * 통계 조회
   */
  getStats() {
    const distortionCounts = {};
    this.detectionHistory.forEach(h => {
      distortionCounts[h.type] = (distortionCounts[h.type] || 0) + 1;
    });

    return {
      totalDetections: this.detectionHistory.length,
      distortionCounts,
      mostCommon: Object.entries(distortionCounts).sort((a, b) => b[1] - a[1])[0] || null
    };
  }
}

module.exports = CognitiveDistortionDetector;
