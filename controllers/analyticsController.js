const errorHandler = require('../services/ErrorHandler');

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
      message: 'Failed to store alert',
    });
  }
}

module.exports = { createAlert };
