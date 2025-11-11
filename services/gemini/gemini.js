const { GoogleGenerativeAI } = require("@google/generative-ai");
const errorHandler = require("../ErrorHandler");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ⏱️ Timeout configuration (configurable via environment variable)
const GEMINI_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS) || 45000; // Default 45 seconds (increased from 30s)

/**
 * Wraps a promise with a timeout mechanism
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of the operation (for error messages)
 * @returns {Promise} Promise that rejects with timeout error if exceeded
 */
function withTimeout(promise, timeoutMs, operationName = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs)
    )
  ]);
}

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
  // ✅ initialLandmarks는 배열 전체여야 함 (landmarksHandler에서 배열로 저장됨)
  const initialLandmarks = firstValidFrame.landmarks;

  // 초기값 검증
  if (!initialLandmarks || !Array.isArray(initialLandmarks) || initialLandmarks.length === 0) {
    console.error('❌ 초기 랜드마크 형식 오류:', {
      exists: !!initialLandmarks,
      isArray: Array.isArray(initialLandmarks),
      length: initialLandmarks?.length
    });
    return "데이터 형식 오류";
  }

  const framesCount = accumulatedData.length;
  const coordinateChanges = {};
  const frameStats = { validFrames: 0, invalidFrames: 0 };

  for (const key in KEY_INDICES) {
    coordinateChanges[key] = { min_y: Infinity, max_y: -Infinity, avg_y: 0, count: 0 };
  }

  // ✅ 데이터 수신 확인 로그 (첫 번째 프레임만)
  console.log(`📊 랜드마크 분석 시작:`, {
    totalFrames: framesCount,
    initialLandmarkType: typeof initialLandmarks,
    initialLandmarkLength: Array.isArray(initialLandmarks) ? initialLandmarks.length : 'not-array'
  });

  accumulatedData.forEach((frame, frameIdx) => {
    // ✅ FIX: Use full landmarks array directly, not landmarks[0]
    // frame.landmarks is [{x,y,z}, {x,y,z}, ...468] - flat array from frontend
    const face = frame.landmarks;

    // 🔍 [CRITICAL] 첫 번째 프레임 상세 검증
    if (frameIdx === 0) {
      console.log(`🔍 [CRITICAL] First frame validation:`, {
        faceExists: !!face,
        faceType: typeof face,
        faceIsArray: Array.isArray(face),
        faceLength: Array.isArray(face) ? face.length : 'N/A',
        firstPointExample: Array.isArray(face) && face[0] ? { x: face[0].x, y: face[0].y, z: face[0].z } : 'N/A'
      });
    }

    if (!face || !Array.isArray(face) || face.length === 0) {
      frameStats.invalidFrames++;
      if (frameIdx < 3) {
        console.log(`🔍 [CRITICAL] Frame ${frameIdx} invalid - face not found or not array`, {
          faceExists: !!face,
          isArray: Array.isArray(face),
          length: face?.length
        });
      }
      return; // 얼굴 없으면 건너뜀
    }

    let frameHasValidData = false;
    let invalidReasonCount = 0;

    for (const key in KEY_INDICES) {
      const idx = KEY_INDICES[key];

      // ✅ 좌표값 유효성 검사 강화
      const facePoint = face[idx];
      const initPoint = initialLandmarks[idx];

      if (!facePoint || !initPoint) {
        invalidReasonCount++;
        continue;
      }
      if (typeof facePoint.y !== 'number' || typeof initPoint.y !== 'number') {
        invalidReasonCount++;
        if (frameIdx === 0 && key === 'MOUTH_LEFT_CORNER') {
          console.log(`🔍 [CRITICAL] Type check failed:`, {
            facePointYType: typeof facePoint.y,
            initPointYType: typeof initPoint.y
          });
        }
        continue;
      }
      if (isNaN(facePoint.y) || isNaN(initPoint.y)) {
        invalidReasonCount++;
        continue;
      }

      const relY = facePoint.y - initPoint.y;

      // ✅ 계산 결과 검증
      if (isNaN(relY)) {
        invalidReasonCount++;
        continue;
      }

      coordinateChanges[key].min_y = Math.min(coordinateChanges[key].min_y, relY);
      coordinateChanges[key].max_y = Math.max(coordinateChanges[key].max_y, relY);
      coordinateChanges[key].avg_y += relY;
      coordinateChanges[key].count += 1;
      frameHasValidData = true;
    }

    if (frameHasValidData) {
      frameStats.validFrames++;
    } else {
      frameStats.invalidFrames++;
      if (frameIdx < 3) {
        console.log(`🔍 [CRITICAL] Frame ${frameIdx} invalid - no valid coordinates (checked ${Object.keys(KEY_INDICES).length} keys)`);
      }
    }
  });

  // ✅ 평균값 계산 (유효한 데이터만 사용)
  for (const key in coordinateChanges) {
    const count = coordinateChanges[key].count;
    if (count > 0) {
      coordinateChanges[key].avg_y /= count;
    } else {
      // ✅ 데이터가 없으면 초기화
      coordinateChanges[key].min_y = 0;
      coordinateChanges[key].max_y = 0;
      coordinateChanges[key].avg_y = 0;
    }
  }

  // ✅ 분석 결과 로그
  console.log(`📊 랜드마크 분석 결과:`, {
    validFrames: frameStats.validFrames,
    invalidFrames: frameStats.invalidFrames,
    dataValidityPercent: Math.round((frameStats.validFrames / framesCount) * 100)
  });

  let summaryText = `총 ${framesCount}프레임 동안의 얼굴 변화 요약 (유효: ${frameStats.validFrames}):\n`;
  for (const key in coordinateChanges) {
    const d = coordinateChanges[key];
    summaryText += `- ${key}: min=${d.min_y.toFixed(3)}, max=${d.max_y.toFixed(3)}, avg=${d.avg_y.toFixed(3)} (count=${d.count})\n`;
  }

  const mouthMove =
    (coordinateChanges.MOUTH_LEFT_CORNER?.max_y || 0) - (coordinateChanges.MOUTH_LEFT_CORNER?.min_y || 0);
  const browMove =
    (coordinateChanges.BROW_CENTER?.max_y || 0) - (coordinateChanges.BROW_CENTER?.min_y || 0);

  summaryText += `입 움직임 폭=${mouthMove.toFixed(3)}, 눈썹 움직임 폭=${browMove.toFixed(3)}\n`;
  console.log("✅ summaryText 생성 완료", { mouthMove: mouthMove.toFixed(3), browMove: browMove.toFixed(3) });

  // ✅ 향상된 프롬프트: 더 상세한 분석 기준
  const prompt = `
당신은 얼굴 표정 변화 전문가입니다.

【얼굴 움직임 데이터 분석】
${summaryText}

【발화 내용(STT) 및 맥락】
"${speechText?.trim() || "발화 없음"}"

【감정 분류 기준 (매우 정확하게)】

1️⃣ 행복 (Happy):
   - 입가 끝이 올라감 (max_y > 0.005)
   - 눈가 주름이 있음
   - 전반적으로 밝은 표정
   예: mouthMove > 0.007, browMove < 0.002

2️⃣ 슬픔 (Sad):
   - 입가 끝이 내려감 (max_y < -0.005)
   - 눈썹이 안쪽으로 모임
   - 음성에서 슬픈 표현 ("슬프다", "우울하다", "싫다")

3️⃣ 분노 (Angry):
   - 눈썹이 깊게 모여있음 (browMove가 음수)
   - 입이 다물려있거나 심하게 벌려있음
   - 음성에서 화난 표현 ("화난다", "짜증", "분노")

4️⃣ 불안 (Anxious):
   - 눈이 크게 벌려져 있음
   - 입이 떨림 (변화가 불규칙함)
   - 음성에서 불안 표현 ("불안하다", "걱정", "떨린다")

5️⃣ 흥분 (Excited):
   - 입과 눈이 크게 벌려짐
   - 모든 표정이 크게 변함
   - 음성에서 신나는 표현 ("신난다", "좋다", "와")

6️⃣ 중립 (Neutral):
   - 입과 눈 움직임이 거의 없음 (모두 < 0.003)
   - 음성도 무표정 또는 중립적
   - 위의 어떤 특징도 명확하지 않음

【응답 형식】
다음 감정 중 정확히 하나만 선택:
행복, 슬픔, 분노, 불안, 흥분, 중립

마크다운 없이 한 단어만 출력하세요.
예: "행복"
  `;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // ⏱️ Wrap with timeout: 30s allows Gemini to respond even after WebSocket closes
    console.log(`🕐 [CRITICAL] Starting Gemini request with ${GEMINI_TIMEOUT_MS}ms timeout`);
    const startTime = Date.now();

    const res = await withTimeout(
      model.generateContent(prompt),
      GEMINI_TIMEOUT_MS,
      'Gemini emotion analysis'
    );

    const elapsedTime = Date.now() - startTime;
    console.log(`⏱️ [CRITICAL] Gemini response received after ${elapsedTime}ms`);

    const rawResponse = res.response.text().trim().split("\n").pop();
    console.log("Gemini 전송 완료", speechText);
    console.log("📤 [CRITICAL] Raw Gemini response:", rawResponse);

    // ✅ 감정 타입 추출 (한글 → 영문) - 확장된 매핑
    const emotionMapping = {
      // Happy
      '행복': 'happy',
      '기쁨': 'happy',
      '즐거움': 'happy',
      '웃음': 'happy',
      '좋음': 'happy',
      '신남': 'happy',
      '즐거워': 'happy',
      '행복해': 'happy',

      // Sad
      '슬픔': 'sad',
      '우울': 'sad',
      '슬퍼': 'sad',
      '우울해': 'sad',
      '서럽': 'sad',
      '눈물': 'sad',
      '힘듦': 'sad',
      '외로움': 'sad',

      // Angry
      '분노': 'angry',
      '화남': 'angry',
      '짜증': 'angry',
      '화나': 'angry',
      '분노해': 'angry',
      '화내': 'angry',
      '성남': 'angry',
      '격노': 'angry',

      // Anxious
      '불안': 'anxious',
      '걱정': 'anxious',
      '불안해': 'anxious',
      '걱정되': 'anxious',
      '떨림': 'anxious',
      '긴장': 'anxious',
      '불편': 'anxious',
      '신경쓰': 'anxious',

      // Excited
      '흥분': 'excited',
      '신남': 'excited',
      '흥분했': 'excited',
      '신났': 'excited',
      '설렘': 'excited',
      '들뜸': 'excited',
      '신나': 'excited',
      '흥분해': 'excited',

      // Neutral
      '중립': 'neutral',
      '무감정': 'neutral',
      '무표정': 'neutral',
      '보통': 'neutral',
      '평상': 'neutral',
      '보통이': 'neutral',
      '괜찮': 'neutral'
    };

    // rawResponse에서 특수문자 제거 (마크다운 등)
    const cleanedResponse = rawResponse.replace(/[*`#\-\[\]"]/g, '').trim();
    console.log(`🔍 [CRITICAL] Raw response (cleaned): "${cleanedResponse}"`);
    console.log(`📊 [CRITICAL] Analyzing for emotions from: "${cleanedResponse}"`);

    let detectedEmotion = 'neutral';  // 기본값
    let foundMatch = false;

    // 정확한 단어 매칭 (공백으로 분리된 단어)
    const words = cleanedResponse.split(/[\s,，、]/);
    console.log(`🔍 [CRITICAL] Split words: ${JSON.stringify(words)}`);

    for (const word of words) {
      if (emotionMapping[word]) {
        detectedEmotion = emotionMapping[word];
        foundMatch = true;
        console.log(`✅ [CRITICAL] Exact word match: "${word}" → "${detectedEmotion}"`);
        break;
      }
    }

    // 포함 매칭 (부분 문자열 포함)
    if (!foundMatch) {
      for (const [korean, english] of Object.entries(emotionMapping)) {
        if (cleanedResponse.includes(korean)) {
          detectedEmotion = english;
          foundMatch = true;
          console.log(`✅ [CRITICAL] Substring match: "${korean}" found in response → "${english}"`);
          break;
        }
      }
    }

    if (!foundMatch) {
      console.log(`⚠️ [CRITICAL] No emotion match found in: "${cleanedResponse}", using default: "neutral"`);
    }

    console.log(`✅ [CRITICAL] Final emotion type: ${detectedEmotion}`, {
      rawResponse: rawResponse.substring(0, 50),
      cleanedResponse: cleanedResponse.substring(0, 50),
      foundMatch
    });
    return detectedEmotion;
  } catch (err) {
    errorHandler.handle(err, {
      module: 'gemini-analysis',
      level: errorHandler.levels.ERROR,
      metadata: {
        framesCount,
        speechTextLength: speechText?.length || 0,
        mouthMove,
        browMove
      }
    });
    return "neutral";  // 에러 시 기본값을 "분석 실패" 대신 "neutral"로
  }
}

// Simple text-based emotion analysis using Gemini
async function analyzeEmotion(text) {
  const input = (text || '').toString().slice(0, 2000);
  const prompt = `Classify the predominant emotion of the following Korean/English text into one of [happy, sad, angry, anxious, neutral]. Return ONLY the label.\n\nText: "${input}"`;
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // ⏱️ Apply timeout to simple emotion analysis as well
    const res = await withTimeout(
      model.generateContent(prompt),
      GEMINI_TIMEOUT_MS,
      'Gemini text-based emotion analysis'
    );

    const label = (res?.response?.text?.() || '').trim().toLowerCase();
    const allowed = ['happy','sad','angry','anxious','neutral'];
    return allowed.includes(label) ? label : 'neutral';
  } catch (err) {
    errorHandler.handle(err, { module: 'gemini-emotion', level: errorHandler.levels.ERROR, metadata: { hasKey: !!process.env.GEMINI_API_KEY } });
    return 'neutral';
  }
}

async function generateDetailedReport(accumulatedData, speechText = "") {
  if (!accumulatedData || accumulatedData.length === 0) return { error: '데이터 없음' };

  // 재사용: 간단한 요약 텍스트 생성
  const firstValidFrame = accumulatedData.find(f => f.landmarks && f.landmarks[0]);
  const initialLandmarks = firstValidFrame ? firstValidFrame.landmarks[0] : null;
  const framesCount = accumulatedData.length;
  const coordinateChanges = {};
  for (const key in KEY_INDICES) {
    coordinateChanges[key] = { min_y: Infinity, max_y: -Infinity, avg_y: 0 };
  }
  accumulatedData.forEach((frame) => {
    const face = frame.landmarks?.[0];
    if (!face) return;
    for (const key in KEY_INDICES) {
      const idx = KEY_INDICES[key];
      if (!face[idx] || !initialLandmarks[idx]) continue;
      const relY = face[idx].y - initialLandmarks[idx].y;
      coordinateChanges[key].min_y = Math.min(coordinateChanges[key].min_y, relY);
      coordinateChanges[key].max_y = Math.max(coordinateChanges[key].max_y, relY);
      coordinateChanges[key].avg_y += relY;
    }
  });
  for (const key in coordinateChanges) {
    coordinateChanges[key].avg_y /= framesCount;
  }

  // 구조화된 프롬프트 생성: 감정 지표, 신뢰도, 권장 행동 등 (마지막 종합 지표 출력 예시)
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // ⏱️ Apply timeout to detailed report generation as well
    const res = await withTimeout(
      model.generateContent(prompt),
      GEMINI_TIMEOUT_MS,
      'Gemini detailed report generation'
    );

    // Gemini 응답 파싱 시도: 텍스트에서 JSON 추출
    const text = res.response.text().trim();
    // 빠른 파싱: 텍스트에서 첫 번째 '{'부터 '}' 쌍을 찾아 JSON 파싱
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

/**
 * Stream AI counseling response with conversation history and emotion context
 * @param {Array} conversationHistory - Array of {role, content} objects
 * @param {string} currentEmotion - Current user emotion (anxious, sad, angry, happy, neutral)
 * @param {Function} onChunk - Callback function for each chunk: (chunk: string) => void
 * @param {Function} onComplete - Callback function on completion: (fullResponse: string) => void
 * @param {Function} onError - Callback function on error: (error: Error) => void
 * @returns {Promise<void>}
 */
async function streamCounselingResponse(conversationHistory, currentEmotion, onChunk, onComplete, onError) {
  try {
    const { buildSystemPrompt, formatConversationHistory } = require('./prompts');

    // Build emotion-based system prompt
    const systemPrompt = buildSystemPrompt(currentEmotion);

    // Format conversation history for Gemini
    const formattedHistory = formatConversationHistory(conversationHistory);

    // Prepare the model with system instructions
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    // Start chat with history
    const chat = model.startChat({
      history: formattedHistory,
    });

    console.log(`🤖 Starting AI streaming response (emotion: ${currentEmotion}, history: ${formattedHistory.length} messages)`);
    const startTime = Date.now();

    // Stream the response
    const result = await withTimeout(
      chat.sendMessageStream("Continue the conversation based on the context above."),
      GEMINI_TIMEOUT_MS,
      'Gemini counseling stream'
    );

    let fullResponse = '';

    // Process each chunk as it arrives
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;

      // Send chunk to client via callback
      if (onChunk && typeof onChunk === 'function') {
        onChunk(chunkText);
      }
    }

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ AI streaming completed (${elapsedTime}ms, ${fullResponse.length} chars)`);

    // Call completion callback
    if (onComplete && typeof onComplete === 'function') {
      onComplete(fullResponse);
    }

  } catch (err) {
    console.error('❌ AI streaming error:', err.message);
    errorHandler.handle(err, {
      module: 'gemini-streaming',
      level: errorHandler.levels.ERROR,
      metadata: {
        emotion: currentEmotion,
        historyLength: conversationHistory?.length || 0,
      },
    });

    // Call error callback
    if (onError && typeof onError === 'function') {
      onError(err);
    }
  }
}

module.exports = { analyzeExpression, generateDetailedReport, analyzeEmotion, streamCounselingResponse };
