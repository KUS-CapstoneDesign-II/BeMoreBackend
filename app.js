const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
const { analyzeExpression } = require("./gemini/gemini");

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const server = http.createServer(app); // WebSocket 을 위한 HTTP 서버 객체

// app.get("/", async(req, res)=>{
//   try{
//     //const landmarks=[];
//     const result = await analyzeExpression();
//     res.send(result);
//   }
//   catch(err){
//     res.status(500).send("Error analizing expression");
//   }
// });

const wss = new WebSocket.Server({ server });

//얼굴 landmark 데이터 받기
wss.on("connection", (socket) => {
  console.log("client connected");

  let latestLandmarks = null;
  let analyzing = false;

  const interval = setInterval(async () => {
    if (latestLandmarks && !analyzing) {
      analyzing = true;
      try {

        const startTime = Date.now(); // 시작 시간 기록
        const expression = await analyzeExpression(latestLandmarks);
        const elapsed = Date.now() - startTime; // 경과 시간 계산
        console.log(`표정 분석 결과: ${expression} (응답시간: ${elapsed} ms)`);
        console.log("표정 분석 결과:", expression);
        socket.send(JSON.stringify({ expression }));
      } catch (err) {
        console.error("Gemini analyze error:", err);
      } finally {
        analyzing = false;
      }
    }
  }, 3000);

  socket.on("message", async (data) => {
    try {
      latestLandmarks = JSON.parse(data);

      //console.log("received landmarks : " , latestLandmarks);

    } catch (err) {
      console.error("WS message error: ", err);
    }

  });
  socket.on("close", () => {
    clearInterval(interval);
    console.log("client disconnected");
  });

});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
