const PDFDocument = require('pdfkit');

/**
 * PdfReportGenerator
 * - Generate a PDF Buffer from a structured session report object
 * - Minimal styling for portability; can be themed later
 */
class PdfReportGenerator {
  static generate(report) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 48 });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(18)
          .text('BeMore · Session Report', { align: 'left' })
          .moveDown(0.5);

        doc
          .fontSize(10)
          .fillColor('#666')
          .text(`Report ID: ${report.reportId}`)
          .text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`)
          .moveDown(1)
          .fillColor('#000');

        // Metadata
        const md = report.metadata || {};
        doc
          .fontSize(14)
          .text('1) Session Metadata')
          .moveDown(0.5)
          .fontSize(11)
          .text(`Session ID: ${md.sessionId || '-'}`)
          .text(`User ID: ${md.userId || '-'}`)
          .text(`Status: ${md.status || '-'}`)
          .text(`Duration: ${md.durationFormatted || '-'} (${md.duration || 0} ms)`)
          .moveDown(1);

        // Overall Assessment
        const overall = report.analysis?.overallAssessment || {};
        doc
          .fontSize(14)
          .text('2) Overall Assessment')
          .moveDown(0.5)
          .fontSize(11)
          .text(`Risk Score: ${overall.riskScore ?? '-'} (${overall.riskLevel || '-'})`)
          .text(`Emotional State: ${overall.emotionalState || '-'}`)
          .text(`Communication Pattern: ${overall.communicationPattern || '-'}`)
          .text(`Cognitive Pattern: ${overall.cognitivePattern || '-'}`)
          .moveDown(0.5);
        const obs = overall.keyObservations || [];
        if (obs.length > 0) {
          doc.text('Key Observations:');
          obs.slice(0, 5).forEach((o, i) => doc.text(`  ${i + 1}. ${o}`));
          doc.moveDown(1);
        }

        // Emotion Summary
        const emo = report.analysis?.emotionSummary || {};
        doc
          .fontSize(14)
          .text('3) Emotion Summary')
          .moveDown(0.5)
          .fontSize(11)
          .text(`Total Analyses: ${emo.totalCount || 0}`)
          .text(`Dominant Emotion: ${emo.dominantEmotion ? `${emo.dominantEmotion.emotion} (${emo.dominantEmotion.percentage}%)` : '-'}`)
          .text(`Variability: ${emo.emotionalVariability ?? '-'}`)
          .moveDown(1);

        // Voice Metrics Summary
        const vad = report.analysis?.vadSummary || {};
        const vm = vad.averageMetrics || {};
        doc
          .fontSize(14)
          .text('4) Voice Metrics Summary')
          .moveDown(0.5)
          .fontSize(11)
          .text(`Speech Rate: ${vm.speechRate ?? '-'}%  | Silence Rate: ${vm.silenceRate ?? '-'}%`)
          .text(`Avg Speech: ${vm.avgSpeechDuration ?? '-'} ms | Avg Silence: ${vm.avgSilenceDuration ?? '-'} ms`)
          .text(`Turns: ${vm.speechTurnCount ?? '-'} | Interruptions: ${vm.interruptionRate ?? '-'}%`)
          .text(`Energy Variance: ${vm.energyVariance ?? '-'}`)
          .moveDown(1);

        // VAD (Valence/Arousal/Dominance)
        const emotionVAD = report.vadVector || report.analysis?.vadVector || null;
        if (emotionVAD) {
          doc
            .fontSize(14)
            .text('5) VAD (Valence/Arousal/Dominance)')
            .moveDown(0.5)
            .fontSize(11)
            .text(`Valence: ${emotionVAD.valence}`)
            .text(`Arousal: ${emotionVAD.arousal}`)
            .text(`Dominance: ${emotionVAD.dominance}`)
            .moveDown(1);
        }

        // CBT Details (top items only)
        const cbt = report.cbtDetails || {};
        const distortions = cbt.distortions || [];
        doc
          .fontSize(14)
          .text('6) CBT Highlights')
          .moveDown(0.5)
          .fontSize(11)
          .text(`Detections: ${cbt.summary?.totalDistortions ?? distortions.length}`)
          .text(`Interventions: ${cbt.summary?.totalInterventions ?? (cbt.interventions?.length || 0)}`)
          .moveDown(0.5);
        distortions.slice(0, 5).forEach((d, i) => {
          doc.text(`  ${i + 1}. ${d.name_ko} (${d.severity}, conf: ${d.confidence})`);
        });

        // Recommendations
        const recs = report.analysis?.recommendations || [];
        if (recs.length > 0) {
          doc.moveDown(1).fontSize(14).text('7) Recommendations').moveDown(0.5).fontSize(11);
          recs.slice(0, 5).forEach((r, i) => {
            doc.text(`  ${i + 1}. [${r.priority}] ${r.title}`);
            if (r.description) doc.text(`     - ${r.description}`);
          });
        }

        // Footer
        doc.moveDown(2).fontSize(9).fillColor('#666')
          .text('BeMore · AI-based CBT Reflection Report', { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = PdfReportGenerator;


