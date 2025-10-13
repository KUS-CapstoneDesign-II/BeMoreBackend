const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Mediapipe 주요 랜드마크 인덱스
const KEY_INDICES = {
  LEFT_EYE_INNER: 33,
  LEFT_EYE_OUTER: 133,
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_OUTER: 263,
  NOSE_TIP: 1,
  MOUTH_LEFT_CORNER: 61,
  MOUTH_RIGHT_CORNER: 291,
  CHIN: 152,
  BROW_CENTER: 168,
};

async function analyzeExpression(accumulatedData, speechText = "") {
  if (!accumulatedData || accumulatedData.length === 0) return "데이터 없음";

  // 얼굴 데이터가 있는 첫 번째 프레임을 초기값으로 사용
  const firstValidFrame = accumulatedData.find(f => f.landmarks && f.landmarks[0]);
  if (!firstValidFrame) return "데이터 없음";
  const initialLandmarks = firstValidFrame.landmarks[0];

  const framesCount = accumulatedData.length;
  const coordinateChanges = {};

  for (const key in KEY_INDICES) {
    coordinateChanges[key] = { min_y: Infinity, max_y: -Infinity, avg_y: 0 };
  }

  accumulatedData.forEach((frame) => {
    const face = frame.landmarks?.[0];
    if (!face) return; // 얼굴 없으면 건너뜀
    for (const key in KEY_INDICES) {
      const idx = KEY_INDICES[key];
      if (!face[idx] || !initialLandmarks[idx]) continue; // 안전 체크
      const relY = face[idx].y - initialLandmarks[idx].y;
      coordinateChanges[key].min_y = Math.min(coordinateChanges[key].min_y, relY);
      coordinateChanges[key].max_y = Math.max(coordinateChanges[key].max_y, relY);
      coordinateChanges[key].avg_y += relY;
    }
  });

  for (const key in coordinateChanges) {
    coordinateChanges[key].avg_y /= framesCount;
  }

  let summaryText = `총 ${framesCount}프레임 동안의 얼굴 변화 요약:\n`;
  for (const key in coordinateChanges) {
    const d = coordinateChanges[key];
    summaryText += `- ${key}: min=${d.min_y.toFixed(3)}, max=${d.max_y.toFixed(3)}, avg=${d.avg_y.toFixed(3)}\n`;
  }

  const mouthMove =
    coordinateChanges.MOUTH_LEFT_CORNER.max_y - coordinateChanges.MOUTH_LEFT_CORNER.min_y;
  const browMove =
    coordinateChanges.BROW_CENTER.max_y - coordinateChanges.BROW_CENTER.min_y;

  summaryText += `입 움직임 폭=${mouthMove.toFixed(3)}, 눈썹 움직임 폭=${browMove.toFixed(3)}\n`;

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

    console.log("Gemini 전송 완료", speechText);
    return res.text.trim().split("\n").pop();
  } catch (err) {
    console.error("Gemini Error:", err);
    return "분석 실패";
  }
}

module.exports = { analyzeExpression };
