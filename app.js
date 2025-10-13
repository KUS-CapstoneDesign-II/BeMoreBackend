const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const dotenv = require("dotenv");
const sttRouter = require("./routes/stt");
const { setupLandmarkSocket } = require("./services/socket/setupLandmarkSocekt");

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use("/api", sttRouter);
app.use(express.static(path.join(__dirname, "public")));

setupLandmarkSocket(wss);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
