const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const sttRouter = require("./routes/stt");
const sessionRouter = require("./routes/session");
const monitoringRouter = require("./routes/monitoring");
const surveyRouter = require("./routes/survey");
const dashboardRouter = require("./routes/dashboard");
const userRouter = require("./routes/user");
const { setupWebSockets } = require("./services/socket/setupWebSockets");
const errorHandler = require("./services/ErrorHandler");
const { sequelize } = require("./models");
const { optionalJwtAuth } = require("./middlewares/auth");

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 보안 헤더
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));

// 기본 레이트 리미팅 (IP당 10분 600 요청)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS 설정 (프론트엔드 연동)
const defaultAllowed = ['http://localhost:5173', 'https://be-more-frontend.vercel.app'];
const envAllowed = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const allowedOrigins = envAllowed.length ? envAllowed : defaultAllowed;

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // 서버-서버/헬스체크 등
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Preflight 응답 처리 강화
app.options('*', cors());

app.use(express.json());
// 환경 변수 유효성 체크 (필수 값)
const requiredEnv = ['PORT'];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`⚠️ Missing required env: ${missing.join(', ')}`);
}
app.use("/api/stt", optionalJwtAuth, sttRouter);
app.use("/api/session", optionalJwtAuth, sessionRouter);
app.use("/api/monitoring", monitoringRouter);
app.use("/api/survey", surveyRouter);
app.use("/api/dashboard", optionalJwtAuth, dashboardRouter);
app.use("/api/user", optionalJwtAuth, userRouter);
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
