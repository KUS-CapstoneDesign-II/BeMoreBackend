const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const dotenv = require("dotenv");
const sttRouter = require("./routes/stt");
const sessionRouter = require("./routes/session");
const { setupWebSockets } = require("./services/socket/setupWebSockets");

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use("/api/stt", sttRouter);
app.use("/api/session", sessionRouter);
app.use(express.static(path.join(__dirname, "public")));

// WebSocket 3채널 라우터 설정
setupWebSockets(wss);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
