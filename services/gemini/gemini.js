const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// 각 카테고리에서 사용할 대표 landmark 인덱스
const LANDMARK_KEY_MAP = {
  LEFT_EYE: { category: "eyes", idx: 0 },
  RIGHT_EYE: { category: "eyes", idx: 1 },
  LEFT_BROW: { category: "eyebrows", idx: 0 },
  RIGHT_BROW: { category: "eyebrows", idx: 1 },
  NOSE: { category: "nose", idx: 0 },
  MOUTH_LEFT_CORNER: { category: "mouth", idx: 0 },
  MOUTH_RIGHT_CORNER: { category: "mouth", idx: 6 },
  CHIN: { category: "contour", idx: 8 }
};

/**
 * 얼굴 표정과 STT를 기반으로 한 단어 감정 분석
 * @param {Array} accumulatedData - session.landmarkBuffer
 * @param {string} speechText - STT 텍스트
 * @returns {string} 감정 단어
 */
async function analyzeExpression(accumulatedData, speechText = "") {
  if (!accumulatedData || accumulatedData.length === 0) return "데이터 없음";

  const firstValidFrame = accumulatedData.find(f => f.landmarks && f.landmarks.mouth?.length);
  if (!firstValidFrame) return "데이터 없음";
  const initialLandmarks = firstValidFrame.landmarks;

  const framesCount = accumulatedData.length;

  // 좌표 변화 초기화
  const coordinateChanges = {};
  for (const key in LANDMARK_KEY_MAP) {
    coordinateChanges[key] = { min_y: Infinity, max_y: -Infinity, avg_y: 0 };
  }

  // 모든 프레임 순회
  accumulatedData.forEach(frame => {
    const f = frame.landmarks;
    if (!f) return;

    for (const key in LANDMARK_KEY_MAP) {
      const { category, idx } = LANDMARK_KEY_MAP[key];
      const arr = f[category];
      if (!arr || !arr[idx]) continue;

      const initialY = initialLandmarks[category][idx]?.y ?? arr[idx].y;
      const relY = arr[idx].y - initialY;

      coordinateChanges[key].min_y = Math.min(coordinateChanges[key].min_y, relY);
      coordinateChanges[key].max_y = Math.max(coordinateChanges[key].max_y, relY);
      coordinateChanges[key].avg_y += relY;
    }
  });

  for (const key in coordinateChanges) {
    coordinateChanges[key].avg_y /= framesCount;
  }

  // summary 텍스트 생성
  let summaryText = `총 ${framesCount}프레임 동안의 얼굴 변화 요약:\n`;
  for (const key in coordinateChanges) {
    const d = coordinateChanges[key];
    summaryText += `- ${key}: min=${d.min_y.toFixed(3)}, max=${d.max_y.toFixed(3)}, avg=${d.avg_y.toFixed(3)}\n`;
  }

  const mouthMove = coordinateChanges.MOUTH_LEFT_CORNER.max_y - coordinateChanges.MOUTH_LEFT_CORNER.min_y;
  const browMove = coordinateChanges.LEFT_BROW.max_y - coordinateChanges.LEFT_BROW.min_y;
  summaryText += `입 움직임 폭=${mouthMove.toFixed(3)}, 눈썹 움직임 폭=${browMove.toFixed(3)}\n`;
  console.log("summaryText", summaryText);

  const prompt = `
    당신은 감정 분석 전문가입니다.
    아래 정보를 기반으로 사용자의 감정을 한 단어로 요약하세요.

    [표정 데이터]
    ${summaryText}

    [발화 내용(STT)]
    ${speechText?.trim() ? speechText : "발화 없음"}

    단계:
    1. 표정 변화를 해석합니다.
    2. 발화 내용을 참고하여 감정 단서를 보완합니다.
    3. 표정과 발화를 종합하여 감정을 단어 하나로 출력합니다.
  `;

  try {
    const res = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return res.text.trim().split("\n").pop();
  } catch (err) {
    console.error("Gemini Error:", err);
    return "분석 실패";
  }
}

/**
 * 얼굴 표정과 STT를 기반으로 구조화된 JSON 리포트 생성
 * @param {Array} accumulatedData - session.landmarkBuffer
 * @param {string} speechText - STT 텍스트
 * @returns {Object} { report, raw } 또는 error
 */
async function generateDetailedReport(accumulatedData, speechText = "") {
  if (!accumulatedData || accumulatedData.length === 0) return { error: '데이터 없음' };

  const firstValidFrame = accumulatedData.find(f => f.landmarks && f.landmarks.mouth?.length);
  const initialLandmarks = firstValidFrame?.landmarks ?? null;
  const framesCount = accumulatedData.length;

  const coordinateChanges = {};
  for (const key in LANDMARK_KEY_MAP) {
    coordinateChanges[key] = { min_y: Infinity, max_y: -Infinity, avg_y: 0 };
  }

  accumulatedData.forEach(frame => {
    const f = frame.landmarks;
    if (!f) return;

    for (const key in LANDMARK_KEY_MAP) {
      const { category, idx } = LANDMARK_KEY_MAP[key];
      const arr = f[category];
      if (!arr || !arr[idx]) continue;

      const initialY = initialLandmarks[category][idx]?.y ?? arr[idx].y;
      const relY = arr[idx].y - initialY;

      coordinateChanges[key].min_y = Math.min(coordinateChanges[key].min_y, relY);
      coordinateChanges[key].max_y = Math.max(coordinateChanges[key].max_y, relY);
      coordinateChanges[key].avg_y += relY;
    }
  });

  for (const key in coordinateChanges) {
    coordinateChanges[key].avg_y /= framesCount;
  }

  // Gemini 프롬프트 생성
  const prompt = `
    당신은 심리상담 보조를 위한 감정 분석 전문가입니다. 아래 표정 요약과 발화(STT)를 사용해 구조화된 JSON 리포트를 생성하세요.

    요구사항:
    - emotion: 한 단어(한국어)
    - confidence: 0-1 사이의 신뢰도 수치
    - indicators: 표정별(입,눈썹 등) 강도 점수 { name: string, score: 0-1 }
    - recommendation: 1-3개의 구체적인 조치(짧은 문장)
    - summary: 2-3문장 요약 설명

    [프레임 수] ${framesCount}
    [좌표 변화 요약]
    ${Object.entries(coordinateChanges).map(([k,v]) => `${k}: min=${v.min_y.toFixed(3)}, max=${v.max_y.toFixed(3)}, avg=${v.avg_y.toFixed(3)}`).join('\n')}

    [STT]
    ${speechText?.trim() ? speechText : '발화 없음'}

    출력은 반드시 JSON 형식이어야 하며, 위 필드들을 포함해야 합니다.
  `;

  try {
    const res = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = res.text.trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const jsonStr = text.slice(jsonStart, jsonEnd + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        return { report: parsed, raw: text };
      } catch (parseErr) {
        console.warn('Gemini 응답에서 JSON 파싱 실패:', parseErr);
        return { raw: text, error: '파싱 실패' };
      }
    }
    return { raw: text, error: 'JSON 미포함 응답' };
  } catch (err) {
    console.error('Gemini Error:', err);
    return { error: '분석 오류' };
  }
}

module.exports = { analyzeExpression, generateDetailedReport };
