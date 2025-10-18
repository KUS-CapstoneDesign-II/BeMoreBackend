const { analyzeExpression } = require("../services/gemini/gemini");

// 랜드마크 데이터를 누적할 시간 (10초) => 추후 조정 가능
const ACCUMULATION_DURATION_MS = 10000;

function setupLandmarkSocket(wss) {
  wss.on("connection", (socket) => {
    console.log("client connected");

  // 데이터 누적 버퍼
  let landmarkBuffer = [];
  let latestLandmarks = null; // 실시간 랜드마크를 잠시 저장

  let analyzing = false;
  const sessionStartTime = Date.now();

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
          const parsed = JSON.parse(data);

          // 제어 메시지 처리: { type: 'control', action: 'stop' }
          if (parsed && parsed.type === 'control') {
            if (parsed.action === 'stop') {
              const sessionDuration = Date.now() - sessionStartTime;
              if (sessionDuration < 10000) {
                if (socket.readyState === socket.OPEN) {
                  socket.send(JSON.stringify({ type: 'stop_refused', reason: '세션이 충분히 길지 않습니다. 최소 10초 필요합니다.', duration: sessionDuration }));
                }
                return;
              }

              // 즉시 분석
              try {
                const framesToAnalyze = [...landmarkBuffer];
                const emotion = await analyzeExpression(framesToAnalyze);
                if (socket.readyState === socket.OPEN) {
                  socket.send(JSON.stringify({ type: 'final_analysis', emotion, frames_count: framesToAnalyze.length }));
                }
              } catch (err) {
                console.error('종료 시 즉시 분석 실패 (face_detector):', err);
                if (socket.readyState === socket.OPEN) {
                  socket.send(JSON.stringify({ type: 'analysis_error', message: '종료 시 즉시 분석에 실패했습니다.' }));
                }
              } finally {
                landmarkBuffer = [];
                clearInterval(analysisInterval);
              }

              return;
            }
          }

          latestLandmarks = parsed;
          // 랜드마크가 유효하면 버퍼에 추가
          if (latestLandmarks && Array.isArray(latestLandmarks) && latestLandmarks.length > 0) {
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