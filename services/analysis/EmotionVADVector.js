/**
 * EmotionVADVector - Compute Valence/Arousal/Dominance (0.0 ~ 1.0)
 *
 * Inputs:
 * - emotions: [{ emotion: string, timestamp, ... }]
 * - vadHistory: [{ metrics, psychological, timestamp }]
 * - cbtSummary: MultimodalAnalyzer._analyzeCBT() output (optional)
 *
 * Heuristics (initial version):
 * - Valence: positivity from emotion labels – negative emotions lower valence.
 * - Arousal: voice activity features – speechRate, energyVariance, interruptionRate.
 * - Dominance: talk vs silence balance and cognitive burden – speechRate vs silenceRate, lowered by severe CBT distortions.
 */
class EmotionVADVector {
  constructor() {}

  /**
   * Normalize value into [0,1] with clamp
   */
  _nz(x) {
    const v = Number.isFinite(x) ? x : 0;
    return Math.min(1, Math.max(0, v));
  }

  _mapEmotionToValence(emotion) {
    if (!emotion) return 0.5;
    const e = String(emotion).toLowerCase();
    if (e.includes('happy') || e.includes('행복') || e.includes('기쁨') || e.includes('positive')) return 0.8;
    if (e.includes('neutral') || e.includes('중립')) return 0.5;
    if (e.includes('surpris')) return 0.6;
    if (e.includes('angry') || e.includes('분노') || e.includes('짜증')) return 0.2;
    if (e.includes('sad') || e.includes('슬픔') || e.includes('depress')) return 0.2;
    if (e.includes('anxi') || e.includes('불안') || e.includes('fear')) return 0.3;
    if (e.includes('disgust')) return 0.2;
    return 0.5;
  }

  _valenceFromEmotions(emotions) {
    if (!emotions || emotions.length === 0) return 0.5;
    const lastK = emotions.slice(-5); // recent snapshot
    const vals = lastK.map(e => this._mapEmotionToValence(e.emotion));
    const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
    return this._nz(avg);
  }

  _arousalFromVoice(vadHistory) {
    if (!vadHistory || vadHistory.length === 0) return 0.5;
    const last = vadHistory[vadHistory.length - 1];
    const m = last.metrics || {};
    // speechRate (%), energyVariance (0..inf), interruptionRate (%)
    const speechRate = Math.min(100, Math.max(0, m.speechRate || 0)) / 100; // 0..1
    const energyVar = Math.min(1, (m.energyVariance || 0) / 0.5); // heuristic scale
    const interrup = Math.min(100, Math.max(0, m.interruptionRate || 0)) / 100;
    const arousal = 0.5 * speechRate + 0.3 * energyVar + 0.2 * interrup;
    return this._nz(arousal);
  }

  _dominanceFromVoiceAndCBT(vadHistory, cbtSummary) {
    if (!vadHistory || vadHistory.length === 0) return 0.5;
    const last = vadHistory[vadHistory.length - 1];
    const m = last.metrics || {};
    const speechRate = Math.min(100, Math.max(0, m.speechRate || 0)) / 100;
    const silenceRate = Math.min(100, Math.max(0, m.silenceRate || 0)) / 100;
    let dominance = 0.6 * speechRate + 0.2 * (1 - silenceRate) + 0.2; // base confidence boost
    // Penalize if strong cognitive distortions are present
    if (cbtSummary && cbtSummary.totalDistortions > 0) {
      const density = Math.min(1, cbtSummary.totalDistortions / 10);
      dominance -= 0.3 * density;
    }
    return this._nz(dominance);
  }

  compute({ emotions = [], vadHistory = [], cbtSummary = null }) {
    const valence = this._valenceFromEmotions(emotions);
    const arousal = this._arousalFromVoice(vadHistory);
    const dominance = this._dominanceFromVoiceAndCBT(vadHistory, cbtSummary);
    return {
      valence: Number(valence.toFixed(2)),
      arousal: Number(arousal.toFixed(2)),
      dominance: Number(dominance.toFixed(2))
    };
  }

  computeTimeline({ emotions = [], vadHistory = [], windowSize = 3 }) {
    if (!vadHistory || vadHistory.length === 0) return [];
    const timeline = [];
    for (let i = 0; i < vadHistory.length; i++) {
      const slice = vadHistory.slice(0, i + 1);
      const emoSlice = emotions.filter(e => e.timestamp <= (slice[i]?.timestamp || Infinity));
      const vec = this.compute({ emotions: emoSlice, vadHistory: slice });
      timeline.push({ timestamp: slice[i].timestamp, ...vec });
    }
    return timeline;
  }
}

module.exports = EmotionVADVector;


