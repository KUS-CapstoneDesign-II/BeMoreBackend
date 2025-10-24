const MultimodalAnalyzer = require('../analysis/MultimodalAnalyzer');

/**
 * SessionReportGenerator - 세션 리포트 생성
 *
 * Phase 4 핵심 기능:
 * - JSON 리포트 생성
 * - 세션 메타데이터
 * - 감정 타임라인 (10초 단위)
 * - VAD 메트릭 요약
 * - CBT 왜곡 및 개입 목록
 * - 멀티모달 종합 분석
 * - 권장 사항
 *
 * 리포트 구성:
 * 1. 세션 정보
 * 2. 감정 분석
 * 3. VAD 분석
 * 4. CBT 분석
 * 5. 종합 평가
 * 6. 권장 사항
 */

class SessionReportGenerator {
  constructor() {
    this.analyzer = new MultimodalAnalyzer();
    console.log('📄 SessionReportGenerator 초기화 완료');
  }

  /**
   * 세션 리포트 생성
   *
   * @param {Object} session - 세션 객체
   * @returns {Object} 종합 리포트
   */
  generateReport(session) {
    if (!session) {
      throw new Error('세션 데이터가 없습니다');
    }

    // 안전하게 기본값 설정
    const safeSession = {
      ...session,
      emotions: Array.isArray(session.emotions) ? session.emotions : [],
      vadAnalysisHistory: Array.isArray(session.vadAnalysisHistory) ? session.vadAnalysisHistory : [],
      interventionGenerator: session.interventionGenerator || null
    };

    console.log(`📊 세션 리포트 생성 시작: ${safeSession.sessionId}`);

    let metadata, analysis, emotionTimeline, vadTimeline, cbtDetails, statistics;

    try {
      // 1. 세션 메타데이터
      metadata = this._generateMetadata(safeSession);
    } catch (e) {
      console.error('❌ 메타데이터 생성 실패:', e.message);
      throw new Error(`Metadata generation failed: ${e.message}`);
    }

    try {
      // 2. 멀티모달 분석 (가장 복잡한 부분)
      analysis = this.analyzer.analyze(safeSession);
      if (!analysis) {
        throw new Error('분석 결과가 null/undefined입니다');
      }
    } catch (e) {
      console.error('❌ 멀티모달 분석 실패:', e.message);
      throw new Error(`Multimodal analysis failed: ${e.message}`);
    }

    try {
      // 3. 감정 타임라인 (시각화용 데이터)
      emotionTimeline = this._generateEmotionTimeline(safeSession.emotions);
    } catch (e) {
      console.error('❌ 감정 타임라인 생성 실패:', e.message);
      emotionTimeline = [];
    }

    try {
      // 4. VAD 타임라인
      vadTimeline = this._generateVADTimeline(safeSession.vadAnalysisHistory);
    } catch (e) {
      console.error('❌ VAD 타임라인 생성 실패:', e.message);
      vadTimeline = [];
    }

    try {
      // 5. CBT 개입 상세
      cbtDetails = this._generateCBTDetails(safeSession);
    } catch (e) {
      console.error('❌ CBT 상세 생성 실패:', e.message);
      throw new Error(`CBT details generation failed: ${e.message}`);
    }

    try {
      // 6. 요약 통계
      statistics = this._generateStatistics(safeSession, analysis);
    } catch (e) {
      console.error('❌ 통계 생성 실패:', e.message);
      statistics = { session: {}, emotion: {}, vad: {}, cbt: {}, overall: {} };
    }

    const report = {
      reportId: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: Date.now(),
      version: '1.0.0',
      metadata,
      analysis,
      emotionTimeline,
      vadTimeline,
      vadVector: analysis.vadVector,
      cbtDetails,
      statistics
    };

    console.log(`✅ 세션 리포트 생성 완료: ${report.reportId}`);

    return report;
  }

  /**
   * 세션 메타데이터
   */
  _generateMetadata(session) {
    const duration = session.endedAt
      ? session.endedAt - session.startedAt
      : Date.now() - session.startedAt;

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      counselorId: session.counselorId,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt || null,
      duration: duration,
      durationFormatted: this._formatDuration(duration)
    };
  }

  /**
   * 감정 타임라인 생성 (차트용 데이터)
   */
  _generateEmotionTimeline(emotions) {
    if (!emotions || emotions.length === 0) {
      return {
        dataPoints: [],
        emotionCategories: [],
        summary: {
          totalPoints: 0,
          timeSpan: 0
        }
      };
    }

    // 10초 단위 데이터 포인트
    const dataPoints = emotions.map((e, index) => ({
      index: index + 1,
      timestamp: e.timestamp,
      relativeTime: e.timestamp - emotions[0].timestamp, // 시작 시점 기준
      emotion: e.emotion,
      frameCount: e.frameCount,
      sttLength: e.sttLength || 0,
      hasCBTDistortion: e.cbtAnalysis?.hasDistortions || false,
      cbtDistortionCount: e.cbtAnalysis?.detections?.length || 0
    }));

    // 감정 카테고리 추출 (유니크)
    const emotionCategories = [...new Set(emotions.map(e => e.emotion).filter(Boolean))];

    // 시간 범위
    const timeSpan = emotions.length > 0
      ? emotions[emotions.length - 1].timestamp - emotions[0].timestamp
      : 0;

    return {
      dataPoints,
      emotionCategories,
      summary: {
        totalPoints: emotions.length,
        timeSpan,
        timeSpanFormatted: this._formatDuration(timeSpan),
        interval: '10초'
      }
    };
  }

  /**
   * VAD 타임라인 생성
   */
  _generateVADTimeline(vadHistory) {
    if (!vadHistory || vadHistory.length === 0) {
      return {
        dataPoints: [],
        summary: {
          totalPoints: 0
        }
      };
    }

    const dataPoints = vadHistory.map((analysis, index) => ({
      index: index + 1,
      timestamp: analysis.timestamp,
      metrics: analysis.metrics,
      psychological: {
        riskScore: analysis.psychological?.riskScore || 0,
        riskLevel: analysis.psychological?.riskLevel || 'low',
        alerts: analysis.psychological?.alerts || []
      }
    }));

    return {
      dataPoints,
      summary: {
        totalPoints: vadHistory.length
      }
    };
  }

  /**
   * CBT 개입 상세 정보
   */
  _generateCBTDetails(session) {
    if (!session.interventionGenerator) {
      return {
        interventions: [],
        distortions: [],
        summary: {
          totalInterventions: 0,
          totalDistortions: 0
        }
      };
    }

    const interventions = session.interventionGenerator.getInterventionHistory();

    // 모든 왜곡 추출 (emotions가 없을 수 있으므로 안전하게 처리)
    const allDistortions = [];
    if (Array.isArray(session.emotions)) {
      session.emotions.forEach(e => {
        if (e && e.cbtAnalysis?.detections) {
          e.cbtAnalysis.detections.forEach(d => {
            // 일부 요소가 null/undefined일 수 있으므로 안전하게 확장
            const safeDetection = d && typeof d === 'object' ? d : {};
            allDistortions.push({
              timestamp: e.timestamp,
              ...safeDetection
            });
          });
        }
      });
    }

    return {
      interventions: interventions.map(i => ({
        interventionId: i.interventionId,
        timestamp: i.timestamp,
        distortionType: i.distortionType,
        distortionName: i.distortionName,
        severity: i.severity,
        urgency: i.urgency,
        detectedText: i.detectedText,
        questions: i.questions,
        tasks: i.tasks.map(t => ({
          title: t.title,
          description: t.description,
          difficulty: t.difficulty,
          duration: t.duration,
          expectedEffect: t.expectedEffect
        }))
      })),
      distortions: allDistortions.map(d => ({
        timestamp: d.timestamp,
        type: d.type,
        name_ko: d.name_ko,
        severity: d.severity,
        confidence: d.confidence,
        text: d.text
      })),
      summary: {
        totalInterventions: interventions.length,
        totalDistortions: allDistortions.length
      }
    };
  }

  /**
   * 요약 통계
   */
  _generateStatistics(session, analysis) {
    return {
      session: {
        totalEmotionAnalyses: Array.isArray(session.emotions) ? session.emotions.length : 0,
        totalVADAnalyses: Array.isArray(session.vadAnalysisHistory) ? session.vadAnalysisHistory.length : 0,
        totalCBTDistortions: analysis?.cbtSummary?.totalDistortions || 0,
        totalInterventions: analysis?.cbtSummary?.totalInterventions || 0
      },
      emotion: {
        dominantEmotion: analysis.emotionSummary.dominantEmotion,
        emotionalVariability: analysis.emotionSummary.emotionalVariability,
        distribution: analysis.emotionSummary.distribution
      },
      vad: {
        averageMetrics: analysis.vadSummary.averageMetrics,
        psychologicalTrends: analysis.vadSummary.psychologicalTrends
      },
      cbt: {
        mostCommonDistortion: analysis.cbtSummary.mostCommonDistortion,
        distortionDistribution: analysis.cbtSummary.distortionDistribution
      },
      overall: {
        riskScore: analysis.overallAssessment.riskScore,
        riskLevel: analysis.overallAssessment.riskLevel,
        emotionalState: analysis.overallAssessment.emotionalState,
        communicationPattern: analysis.overallAssessment.communicationPattern,
        cognitivePattern: analysis.overallAssessment.cognitivePattern
      }
    };
  }

  /**
   * 시간 포맷팅 (ms → "XX분 XX초")
   */
  _formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}분 ${seconds}초`;
    }
    return `${seconds}초`;
  }

  /**
   * 리포트를 사람이 읽기 쉬운 텍스트로 변환
   */
  generateTextSummary(report) {
    const { metadata, analysis } = report;

    let summary = `
=== BeMore 심리 상담 세션 리포트 ===

세션 ID: ${metadata.sessionId}
상담 시간: ${metadata.durationFormatted}
상태: ${metadata.status}

--- 종합 평가 ---
심리 위험도: ${analysis.overallAssessment.riskScore}/100 (${analysis.overallAssessment.riskLevel})
감정 상태: ${analysis.overallAssessment.emotionalState}
의사소통 패턴: ${analysis.overallAssessment.communicationPattern}
인지 패턴: ${analysis.overallAssessment.cognitivePattern}

--- 주요 관찰 사항 ---
${analysis.overallAssessment.keyObservations.map((obs, i) => `${i + 1}. ${obs}`).join('\n')}

--- 권장 사항 ---
${analysis.recommendations.map((rec, i) => `${i + 1}. [${rec.priority}] ${rec.title}\n   ${rec.description}`).join('\n\n')}

--- 통계 ---
감정 분석 횟수: ${analysis.emotionSummary.totalCount}회
VAD 분석 횟수: ${analysis.vadSummary.totalAnalyses}회
인지 왜곡 탐지: ${analysis.cbtSummary.totalDistortions}건
치료적 개입: ${analysis.cbtSummary.totalInterventions}회
`;

    return summary.trim();
  }
}

module.exports = SessionReportGenerator;
