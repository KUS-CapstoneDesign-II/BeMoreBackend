const { analyzeExpression } = require("../gemini/gemini");
const { getAccumulatedSpeechText, clearSpeechBuffer } = require("../memory");

const ACCUMULATION_DURATION_MS = 60 * 1000; // 1분

function setupLandmarkSocket(wss) {
  wss.on("connection", (socket) => {
    console.log("✅ 클라이언트 연결됨");

    let landmarkBuffer = [];
    let analyzing = false;
    let lastAnalysisTime = Date.now();

    // 1분마다 누적된 얼굴+STT 데이터를 분석
    const analysisInterval = setInterval(async () => {
      if ((landmarkBuffer.length === 0) && (Date.now() - lastAnalysisTime < ACCUMULATION_DURATION_MS)) {
        return;
      }

      analyzing = true;

      // Gemini로 보낼 데이터 준비
      const framesToAnalyze = [...landmarkBuffer];
      const sttToAnalyze = getAccumulatedSpeechText(lastAnalysisTime);

      // 다음 주기를 위해 초기화
      landmarkBuffer = [];
      lastAnalysisTime = Date.now();
      clearSpeechBuffer(lastAnalysisTime);

      try {
        console.log(`📦 1분 누적 전송 (frames: ${framesToAnalyze.length}, stt_len: ${sttToAnalyze.length})`);

       console.log(framesToAnalyze);
        
        const emotion = await analyzeExpression(framesToAnalyze, sttToAnalyze);
        console.log(`🎯 Gemini 분석 결과: ${emotion}`);

        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({
            type: "analysis_result",
            emotion,
            timestamp: new Date().toISOString(),
            frames_count: framesToAnalyze.length,
            stt_snippet: sttToAnalyze ? sttToAnalyze.slice(0, 200) : ""
          }));
        }
      } catch (err) {
        console.error("누적 분석 중 에러:", err);
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify({
            type: "analysis_error",
            message: "누적 분석 중 오류가 발생했습니다."
          }));
        }
      } finally {
        analyzing = false;
      }
    }, ACCUMULATION_DURATION_MS);

    socket.on("message", (data) => {
      try {
        const landmarks = JSON.parse(data);
        if (Array.isArray(landmarks)) {
          landmarkBuffer.push({
            timestamp: Date.now(),
            landmarks
          });
        }
      } catch (err) {
        console.error("WS 데이터 파싱 오류:", err);
      }
    });

    socket.on("close", () => {
      console.log("❌ 클라이언트 연결 종료");
      clearInterval(analysisInterval);
    });

    socket.on("error", (err) => {
      console.error("WS 소켓 에러:", err);
      clearInterval(analysisInterval);
    });
  });
}

module.exports = { setupLandmarkSocket };
