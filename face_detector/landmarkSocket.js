const { analyzeExpression } = require("../services/gemini/gemini");

// 랜드마크 데이터를 누적할 시간 (10초)
const ACCUMULATION_DURATION_MS = 10000;

function setupLandmarkSocket(wss) {
  wss.on("connection", (socket) => {
    console.log("client connected");

    // 데이터 누적 버퍼
    let landmarkBuffer = [];
    let latestLandmarks = null; // 실시간 랜드마크를 잠시 저장

    let analyzing = false;

    // 10초마다 누적된 데이터를 Gemini로 보내 분석하는 타이머
    const analysisInterval = setInterval(async () => {
      // 누적된 데이터가 충분하지 않으면 (최소 5프레임 이상) 건너뛰기
      if (landmarkBuffer.length < 5) {
        // console.log("Buffer too small. Skipping analysis.");
        return;
      }

      if (!analyzing) {
        analyzing = true;

        //  분석할 데이터를 버퍼에서 추출 후 버퍼 초기화 
        const dataToAnalyze = [...landmarkBuffer];
        landmarkBuffer = []; // 버퍼 초기화

        try {
          const startTime = Date.now();
          // analyzeExpression 함수에 누적된 데이터 전체를 전달
          const expression = await analyzeExpression(dataToAnalyze);
          const elapsed = Date.now() - startTime;

          console.log(`표정 분석 결과: ${expression} (응답시간: ${elapsed} ms)`);
          socket.send(JSON.stringify({ expression }));
        } catch (err) {
          console.error("Gemini analyze error:", err);
        } finally {
          analyzing = false;
        }
      }
    }, ACCUMULATION_DURATION_MS); // 10초마다 분석 실행

    socket.on("message", async (data) => {
      try {
        latestLandmarks = JSON.parse(data);
        // 랜드마크가 유효하면 버퍼에 추가
        if (latestLandmarks && Array.isArray(latestLandmarks) && latestLandmarks.length > 0) {
          // 받은 랜드마크 데이터에 타임스탬프를 추가하여 버퍼에 저장 
          landmarkBuffer.push({
            timestamp: Date.now(),
            landmarks: latestLandmarks
          });
        }
      } catch (err) {
        console.error("WS message error: ", err);
      }
    });

    socket.on("close", () => {
      clearInterval(analysisInterval);
      console.log("client disconnected");
    });
  });
}

module.exports = { setupLandmarkSocket };