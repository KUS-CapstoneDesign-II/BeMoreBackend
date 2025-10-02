const { analyzeExpression } = require("../gemini/gemini");

function setupLandmarkSocket(wss) {
  wss.on("connection", (socket) => {
    console.log("client connected");

    let latestLandmarks = null;
    let analyzing = false;

    const interval = setInterval(async () => {
      // 얼굴이 인식되지 않는 경우
      if (!latestLandmarks || !Array.isArray(latestLandmarks) || latestLandmarks.length === 0) {
        return;
      }

      // 얼굴이 인식되는 경우
      if (!analyzing) {
        analyzing = true;
        try {
          const startTime = Date.now();
          const expression = await analyzeExpression(latestLandmarks);
          const elapsed = Date.now() - startTime;

          console.log(`표정 분석 결과: ${expression} (응답시간: ${elapsed} ms)`);
          socket.send(JSON.stringify({ expression }));
        } catch (err) {
          console.error("Gemini analyze error:", err);
        } finally {
          analyzing = false;
        }
      }
    }, 3000); // 3초마다 표정 분석

    socket.on("message", async (data) => {
      try {
        latestLandmarks = JSON.parse(data);
        // console.log("received landmarks:", latestLandmarks);
      } catch (err) {
        console.error("WS message error: ", err);
      }
    });

    socket.on("close", () => {
      clearInterval(interval);
      console.log("client disconnected");
    });
  });
}

module.exports = { setupLandmarkSocket };
