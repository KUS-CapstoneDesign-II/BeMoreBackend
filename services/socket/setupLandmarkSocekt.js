const { analyzeExpression } = require("../gemini/gemini");
const { getLatestSpeechText } = require("../memory");

const ACCUMULATION_DURATION_MS = 10000;

function setupLandmarkSocket(wss) {
  wss.on("connection", (socket) => {
    console.log("✅ 클라이언트 연결됨");

    let landmarkBuffer = [];
    let analyzing = false;

    const analysisInterval = setInterval(async () => {
      if (landmarkBuffer.length < 5 || analyzing) return;

      analyzing = true;
      const dataToAnalyze = [...landmarkBuffer];
      landmarkBuffer = [];

      try {
        const sttText = getLatestSpeechText();
        const emotion = await analyzeExpression(dataToAnalyze, sttText);
        console.log(`🎯 감정 분석 결과: ${emotion}`);
        socket.send(JSON.stringify({ emotion }));
      } catch (err) {
        console.error("분석 에러:", err);
      } finally {
        analyzing = false;
      }
    }, ACCUMULATION_DURATION_MS);

    socket.on("message", (data) => {
      try {
        const landmarks = JSON.parse(data);
        if (Array.isArray(landmarks) && landmarks.length > 0) {
          landmarkBuffer.push({ timestamp: Date.now(), landmarks });
        }
      } catch (err) {
        console.error("WS 데이터 파싱 오류:", err);
      }
    });

    socket.on("close", () => {
      clearInterval(analysisInterval);
      console.log("❌ 클라이언트 연결 종료");
    });
  });
}

module.exports = { setupLandmarkSocket };
