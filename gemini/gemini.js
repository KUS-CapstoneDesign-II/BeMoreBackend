const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

/**
 * landmarks: [{x, y, z}, ...] 형태
 */

async function analyzeExpression(landmarks) {
    try {
        const faceLandmarks = landmarks[0]; // 첫 번째 얼굴
        const keyLandmarks = faceLandmarks.filter((_, i) =>
            // 핵심 얼굴 좌표
            [33, 133, 362, 263, 1, 61, 291,  199, 6, 168, 152, 389, 374, 280].includes(i)
        );
        console.log("keyLandmarks:", keyLandmarks);
        const prompt = `
        아래 정보를 이용해서 사용자의 감정을 말해줄래?
        간단하게 '행복함', '슬픔' 이와 같이 단어로 말해줘
        아래는 제공되는 face landmarks 정보야
        ${JSON.stringify(keyLandmarks)}
        `;


        const res = await genAI.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
            
        });

        return res.text;
    } catch (err) {
        console.error("Gemini API Error:", err);
        return null;
    }
}


module.exports = { analyzeExpression };