const fs = require('fs');
const path = require('path');
const PdfReportGenerator = require('../services/report/PdfReportGenerator');

async function main() {
  const mock = {
    reportId: 'report_demo',
    generatedAt: Date.now(),
    metadata: {
      sessionId: 'sess_demo',
      userId: 'user_demo',
      status: 'ended',
      duration: 600000,
      durationFormatted: '10분 0초'
    },
    analysis: {
      overallAssessment: {
        riskScore: 42,
        riskLevel: 'medium',
        keyObservations: ['높은 침묵 비율 관찰', '인지 왜곡 일부 탐지'],
        emotionalState: 'neutral',
        communicationPattern: 'normal',
        cognitivePattern: 'mild_distortion'
      },
      emotionSummary: {
        totalCount: 12,
        dominantEmotion: { emotion: 'neutral', percentage: 58 },
        emotionalVariability: 0.32
      },
      vadSummary: {
        averageMetrics: {
          speechRate: 48.2,
          silenceRate: 51.8,
          avgSpeechDuration: 820,
          avgSilenceDuration: 950,
          speechTurnCount: 37,
          interruptionRate: 12.3,
          energyVariance: 0.08
        }
      },
      recommendations: [
        { priority: 'medium', title: '호흡 가다듬기', description: '대화 중간에 짧은 심호흡으로 긴장 완화' }
      ],
      vadVector: { valence: 0.51, arousal: 0.46, dominance: 0.57 }
    },
    vadVector: { valence: 0.51, arousal: 0.46, dominance: 0.57 },
    cbtDetails: {
      distortions: [
        { name_ko: '흑백논리', severity: 'medium', confidence: 0.72 }
      ],
      summary: { totalDistortions: 1, totalInterventions: 0 }
    }
  };

  const pdf = await PdfReportGenerator.generate(mock);
  const out = path.join(__dirname, 'out-demo.pdf');
  fs.writeFileSync(out, pdf);
  console.log('PDF written:', out, pdf.length, 'bytes');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


