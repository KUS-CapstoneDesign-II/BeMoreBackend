const fs = require('fs');
const path = require('path');
const { analyzeExpression, generateDetailedReport } = require('../gemini/gemini');
const { getAccumulatedSpeechText, clearSpeechBuffer } = require('../memory');

/**
 * 세션 종료 시 메모리(STT)와 세션 버퍼(랜드마크)를 사용해 최종 리포트를 생성
 * - Gemini 분석을 실행해서 구조화된 리포트와 요약(감정 단어)을 생성
 * - 결과는 tmp/analyses 디렉토리에 JSON으로 저장
 */
async function generateFinalReport(session) {
  if (!session) {
    throw new Error('세션 정보가 없습니다');
  }

  const accumulatedLandmarks = Array.isArray(session.landmarkBuffer) ? session.landmarkBuffer : [];

  // 세션 내부 STT 버퍼와 전역 메모리(STT)를 합침
  const sessionStt = Array.isArray(session.sttBuffer) ? session.sttBuffer.map(s => s.text).join('\n') : '';
  const memoryStt = getAccumulatedSpeechText(session.startedAt || 0);
  const combinedStt = [sessionStt, memoryStt].filter(Boolean).join('\n');

  // Gemini 기반 분석
  const emotion = await analyzeExpression(accumulatedLandmarks, combinedStt);
  const detailed = await generateDetailedReport(accumulatedLandmarks, combinedStt);

  const report = {
    reportId: `report_${Date.now()}_${session.sessionId ? session.sessionId.slice(-6) : 'anon'}`,
    sessionId: session.sessionId || null,
    generatedAt: new Date().toISOString(),
    durationMs: (session.endedAt || Date.now()) - (session.startedAt || 0),
    framesCount: accumulatedLandmarks.length,
    emotion: emotion || null,
    detailed: detailed.report || null,
    raw: detailed.raw || null,
    analysis_error: detailed.error || null,
    stt_snippet: combinedStt ? combinedStt.slice(0, 2000) : ''
  };

  // 결과 파일로 저장
  try {
    const outDir = path.join(__dirname, '..', '..', 'tmp', 'analyses');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${report.reportId}.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
    report.savedPath = outPath;
  } catch (err) {
    console.warn('리포트 파일 저장 실패:', err);
  }

  // 전역 메모리 버퍼 정리 (세션 기준으로)
  try {
    clearSpeechBuffer(Date.now());
  } catch (e) {
    // noop
  }

  return report;
}

module.exports = { generateFinalReport };
