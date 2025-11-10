const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require('morgan');
const pkg = require('./package.json');
const sttRouter = require("./routes/stt");
const sessionRouter = require("./routes/session");
const monitoringRouter = require("./routes/monitoring");
const surveyRouter = require("./routes/survey");
const dashboardRouter = require("./routes/dashboard");
const emotionRouter = require("./routes/emotion");
const userRouter = require("./routes/user");
const healthRouter = require("./routes/health");
const authRouter = require("./routes/auth");
const { setupWebSockets } = require("./services/socket/setupWebSockets");
const errorHandler = require("./services/ErrorHandler");
const { sequelize } = require("./models");
const { optionalJwtAuth } = require("./middlewares/auth");
const { requestId } = require('./middlewares/requestId');
const { validateEnv } = require('./services/config/validateEnv');
const TempFileCleanup = require('./services/system/TempFileCleanup');

dotenv.config();
validateEnv(process.env);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Proxy trust (required on PaaS like Render for correct IPs and rate-limit)
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  app.set('trust proxy', 1);
}

// 보안 헤더
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
    },
    reportOnly: true
  }
}));

// 기본 레이트 리미팅 (IP당 10분 600 요청)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
// Write-endpoint specific stricter limiter
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return writeLimiter(req, res, next);
  }
  return next();
});
app.use(requestId);
// Use requestId from middleware for consistent correlation IDs in logs
morgan.token('id', (req) => req.requestId);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms reqId=:id'));

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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-device-id', 'x-csrf-token', 'x-timestamp', 'x-client-version'],
  exposedHeaders: ['x-request-id', 'x-device-id', 'x-csrf-token', 'x-timestamp']
}));
// Preflight handled by CORS middleware (Express v5-safe)

app.use(express.json({ limit: '1mb' }));

// Temporary file cleanup initialization
const tempCleanup = new TempFileCleanup({
  tmpDir: path.join(process.cwd(), 'tmp'),
  maxAgeDays: process.env.TEMP_FILE_MAX_AGE_DAYS || 7,
  maxSizeMB: process.env.TEMP_FILE_MAX_SIZE_MB || 500,
  checkIntervalMinutes: process.env.TEMP_CLEANUP_INTERVAL_MIN || 60,
});
tempCleanup.start();

// 환경 변수 유효성 체크 (필수 값)
const requiredEnv = ['PORT'];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`⚠️ Missing required env: ${missing.join(', ')}`);
}
app.use("/api/auth", authRouter);
app.use("/api/stt", optionalJwtAuth, sttRouter);
app.use("/api/session", optionalJwtAuth, sessionRouter);
app.use("/api/monitoring", monitoringRouter);
app.use("/api/survey", surveyRouter);
app.use("/api/dashboard", optionalJwtAuth, dashboardRouter);
app.use("/api/user", optionalJwtAuth, userRouter);
app.use("/api/emotion", emotionRouter);
app.use("/api/health", healthRouter);
// Remove static site serving to keep API-only backend
// app.use(express.static(path.join(__dirname, "public")));

// Root status endpoint (API-only landing)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'BeMore Backend API server is running successfully!' });
});


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
    uptime: process.uptime(),
    version: pkg.version,
    commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || process.env.COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null
  });
});

// Error stats endpoint
app.get("/api/errors/stats", (req, res) => {
  res.json(errorHandler.getStats());
});

// Temp file cleanup stats endpoint
app.get("/api/system/temp-cleanup-stats", (req, res) => {
  res.json({
    success: true,
    data: tempCleanup.getStats()
  });
});

// WebSocket 3채널 라우터 설정
setupWebSockets(wss);

// ✅ 전역 에러 핸들러 (Express 미들웨어)
app.use(errorHandler.expressMiddleware());

// 404 Not Found handler (after all routes and error middleware safety)
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found', path: req.path, requestId: req.requestId } });
});


const PORT = process.env.PORT || 8000;

// Only start listening when run directly (not during tests)
if (require.main === module && process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    const hostEnv = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL || '';
    if (hostEnv) {
      console.log(`🚀 서버 실행 중: ${hostEnv}`);
    } else {
      console.log(`🚀 서버 실행 중 (port): ${PORT}`);
    }
  });
}

module.exports = { app, server, wss, tempCleanup };

// Graceful shutdown handlers
function gracefulShutdown(signal) {
  console.log(`🛑 Received ${signal}. Shutting down gracefully...`);
  const shutdownTimer = setTimeout(() => {
    console.error('⏱️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
  shutdownTimer.unref();

  try {
    if (tempCleanup && typeof tempCleanup.stop === 'function') {
      tempCleanup.stop();
    }
  } catch (_) {}

  try {
    if (sequelize && typeof sequelize.close === 'function') {
      sequelize.close().catch(() => {});
    }
  } catch (_) {}

  try {
    server.close(() => {
      try {
        if (wss && typeof wss.close === 'function') {
          wss.close(() => {
            clearTimeout(shutdownTimer);
            console.log('✅ Shutdown complete');
            process.exit(0);
          });
        } else {
          clearTimeout(shutdownTimer);
          process.exit(0);
        }
      } catch (e) {
        clearTimeout(shutdownTimer);
        process.exit(0);
      }
    });
  } catch (e) {
    clearTimeout(shutdownTimer);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 🔴 Error Handler: Uncaught Exceptions
// Only log, don't exit - allows background errors to not crash the server
process.on('uncaughtException', (error) => {
  console.error('');
  console.error('⚠️ ========== UNCAUGHT EXCEPTION (LOGGED) ==========');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  const stackLines = error.stack?.split('\n') || [];
  if (stackLines.length > 1) {
    console.error('Location:', stackLines[1].trim());
  }
  console.error('===================================================');
  console.error('');
  // DO NOT exit - let the process continue for background errors
});

// 🔴 Error Handler: Unhandled Promise Rejections
// Only log, don't exit - allows background promise rejections to not crash the server
process.on('unhandledRejection', (reason, promise) => {
  console.error('');
  console.error('⚠️ ========== UNHANDLED REJECTION (LOGGED) ==========');
  console.error('Promise:', promise);
  console.error('Reason:', reason?.message || reason);
  if (reason?.stack) {
    console.error('Stack:', reason.stack);
    const stackLines = reason.stack.split('\n');
    if (stackLines.length > 1) {
      console.error('Location:', stackLines[1].trim());
    }
  }
  console.error('====================================================');
  console.error('');
  // DO NOT exit - let the process continue for background errors
});
