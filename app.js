const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
const {setupLandmarkSocket} = require("./face_detector/landmarkSocket")


const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const server = http.createServer(app); // WebSocket 을 위한 HTTP 서버 객체
const wss = new WebSocket.Server({ server });

// 1. MediaPipe 를 이용한 얼굴 landmark 좌표 제공
setupLandmarkSocket(wss);



const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
