const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const server = http.createServer(app); // WebSocket 을 위한 HTTP 서버 객체
const wss = new WebSocket.Server({server});

// 얼굴 landmark 데이터 받기
wss.on("connection", (socket) => {
  socket.on("message", (data) =>{
    console.log("Recieved landmarks: ", JSON.parse(data));
  })
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
