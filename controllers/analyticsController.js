const errorHandler = require('../services/ErrorHandler');

/**
 * POST /api/analytics/vitals
 * Core Web Vitals 메트릭 수신
 */
async function createVitals(req, res) {
  try {
    const { metric, value, pathname, id, navigationType } = req.body;

    // Web Vitals 로그 남기기
    console.log(`[Web Vitals] ${metric}=${value.toFixed(2)} at ${pathname}`, {
      id,
      navigationType,
      requestId: req.requestId,
    });

    // TODO: 메트릭을 DB나 모니터링 시스템에 저장 가능
    // 예: await saveMetric({ metric, value, pathname, timestamp: new Date() });

    return res.json({ success: true });
  } catch (err) {
    errorHandler.handle(err, {
      module: 'analytics',
      level: errorHandler.levels.ERROR,
      metadata: {
        method: 'POST',
        path: '/api/analytics/vitals',
        requestId: req.requestId,
      },
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'VITALS_STORAGE_ERROR',
        message: 'Failed to store vitals metric',
      },
    });
  }
}

/**
 * POST /api/analytics/alert
 * 프론트엔드 성능 알림 수신
 */
async function createAlert(req, res) {
  try {
    const { message, timestamp, url } = req.body;

    // 성능 알림 로그 남기기
    errorHandler.handle(
      new Error(`[Performance Alert] ${message}`),
      {
        module: 'analytics',
        level: errorHandler.levels.WARN,
        metadata: {
          timestamp,
          url,
          requestId: req.requestId,
        },
      }
    );

    // 콘솔에도 출력 (개발/디버깅용)
    console.warn(`[Performance Alert] ${message} at ${url} (${timestamp})`);

    return res.json({ success: true });
  } catch (err) {
    errorHandler.handle(err, {
      module: 'analytics',
      level: errorHandler.levels.ERROR,
      metadata: {
        method: 'POST',
        path: '/api/analytics/alert',
        requestId: req.requestId,
      },
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'ALERT_STORAGE_ERROR',
        message: 'Failed to store alert',
      },
    });
  }
}

module.exports = { createVitals, createAlert };
