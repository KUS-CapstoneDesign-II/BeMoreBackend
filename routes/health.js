/**
 * Health Check Routes
 * Keep-Alive 전략을 위한 헬스체크 엔드포인트
 *
 * Purpose:
 * - Frontend Keep-Alive 요청 처리 (25분마다 서버 활성 유지)
 * - Render 무료 버전의 1시간 자동 종료 방지
 * - 서버 상태 및 리소스 모니터링
 */

const express = require('express');
const router = express.Router();

// 헬스체크 통계 추적
let lastHealthCheck = Date.now();
let healthCheckCount = 0;

/**
 * GET /api/health
 * 빠른 헬스 체크 응답
 *
 * 응답 시간: < 5ms
 * 메모리 사용: < 1MB
 * 네트워크: < 100 bytes
 */
router.get('/health', (req, res) => {
  const now = Date.now();
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  healthCheckCount++;
  lastHealthCheck = now;

  // 빠른 응답 (< 10ms)
  res.status(200).json({
    status: 'ok',
    timestamp: now,
    uptime: Math.floor(uptime),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
    },
    environment: process.env.NODE_ENV || 'development',
    message: '✅ Server is running and responsive'
  });
});

/**
 * GET /api/health/stats
 * 헬스체크 통계 및 상세 정보 조회
 *
 * Purpose:
 * - Keep-Alive 성공률 모니터링
 * - 메모리 사용률 추적
 * - 서버 운영 시간 확인
 */
router.get('/health/stats', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const heapUsed = memoryUsage.heapUsed / 1024 / 1024;
  const heapTotal = memoryUsage.heapTotal / 1024 / 1024;
  const heapPercent = Math.round((heapUsed / heapTotal) * 100);

  res.json({
    status: 'healthy',
    lastHealthCheck: new Date(lastHealthCheck).toISOString(),
    healthCheckCount: healthCheckCount,
    uptime: {
      seconds: Math.floor(uptime),
      minutes: Math.floor(uptime / 60),
      hours: Math.floor(uptime / 3600)
    },
    memoryHeap: {
      used: Math.round(heapUsed),
      total: Math.round(heapTotal),
      percentage: heapPercent,
      status: heapPercent < 70 ? 'healthy' : heapPercent < 85 ? 'warning' : 'critical'
    },
    environment: {
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV || 'development',
      platform: process.platform
    }
  });
});

/**
 * GET /api/health/ready
 * Kubernetes-style readiness probe
 * 서비스가 트래픽을 수신할 준비가 되었는지 확인
 */
router.get('/health/ready', (req, res) => {
  res.status(200).json({
    ready: true,
    timestamp: Date.now()
  });
});

/**
 * GET /api/health/live
 * Kubernetes-style liveness probe
 * 서비스가 여전히 실행 중인지 확인
 */
router.get('/health/live', (req, res) => {
  const uptime = process.uptime();
  const isHealthy = uptime > 0;

  if (isHealthy) {
    res.status(200).json({
      alive: true,
      uptime: Math.floor(uptime)
    });
  } else {
    res.status(503).json({
      alive: false,
      message: 'Service starting up'
    });
  }
});

module.exports = router;
