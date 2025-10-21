const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const dotenv = require("dotenv");
const cors = require("cors");
const sttRouter = require("./routes/stt");
const sessionRouter = require("./routes/session");
const monitoringRouter = require("./routes/monitoring");
const surveyRouter = require("./routes/survey");
const { setupWebSockets } = require("./services/socket/setupWebSockets");
const errorHandler = require("./services/ErrorHandler");
const { sequelize } = require("./models");

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// CORS 설정 (프론트엔드 연동)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use("/api/stt", sttRouter);
app.use("/api/session", sessionRouter);
app.use("/api/monitoring", monitoringRouter);
app.use("/api/survey", surveyRouter);
app.use(express.static(path.join(__dirname, "public")));


sequelize.sync({ force: false })
  .then(() => {
    console.log("✅ 데이터베이스 연결 성공");
  }).catch((err) => {
    console.error("❌ 데이터베이스 연결 실패:", err)
  });


// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error stats endpoint
app.get("/api/errors/stats", (req, res) => {
  res.json(errorHandler.getStats());
});

// WebSocket 3채널 라우터 설정
setupWebSockets(wss);

// ✅ 전역 에러 핸들러 (Express 미들웨어)
app.use(errorHandler.expressMiddleware());

// ✅ 전역 에러 핸들러 (Unhandled errors)
process.on('uncaughtException', (error) => {
  errorHandler.handle(error, {
    module: 'process',
    level: errorHandler.levels.CRITICAL
  });
  console.error('🚨 Uncaught Exception - 서버 종료 중...');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  errorHandler.handle(new Error(`Unhandled Rejection: ${reason}`), {
    module: 'process',
    level: errorHandler.levels.CRITICAL,
    metadata: { promise }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
