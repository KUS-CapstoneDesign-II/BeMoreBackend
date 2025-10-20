const express = require('express');
const router = express.Router();
const errorHandler = require('../services/ErrorHandler');

/**
 * 에러 통계 조회 API
 * GET /api/monitoring/error-stats
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "total": 42,
 *     "byType": { "NETWORK": 10, "VALIDATION": 5, ... },
 *     "byModule": { "session": 8, "voice-handler": 12, ... },
 *     "recent": [...]
 *   }
 * }
 */
router.get('/error-stats', (req, res) => {
  try {
    const stats = errorHandler.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 최근 에러 목록 조회 API
 * GET /api/monitoring/recent-errors?limit=20
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "count": 10,
 *     "errors": [...]
 *   }
 * }
 */
router.get('/recent-errors', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const stats = errorHandler.getStats();
    const recentErrors = stats.recent.slice(0, limit);

    res.json({
      success: true,
      data: {
        count: recentErrors.length,
        limit,
        errors: recentErrors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RECENT_ERRORS_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 카테고리별 에러 조회 API
 * GET /api/monitoring/errors/:category
 *
 * Parameters:
 * - category: WEBSOCKET, SESSION, STT, VAD, GEMINI, CBT, DATABASE, NETWORK
 * - limit (query): 최대 개수 (기본값: 50)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "category": "WEBSOCKET",
 *     "count": 5,
 *     "errors": [...]
 *   }
 * }
 */
router.get('/errors/:category', (req, res) => {
  try {
    const category = req.params.category.toUpperCase();
    const limit = parseInt(req.query.limit) || 50;

    // 카테고리 유효성 검사
    const validCategories = ['WEBSOCKET', 'SESSION', 'STT', 'VAD', 'GEMINI', 'CBT', 'DATABASE', 'NETWORK'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `유효하지 않은 카테고리입니다. 사용 가능: ${validCategories.join(', ')}`
        }
      });
    }

    const stats = errorHandler.getStats();
    const categoryErrors = stats.recent
      .filter(err => err.category === category)
      .slice(0, limit);

    res.json({
      success: true,
      data: {
        category,
        count: categoryErrors.length,
        total: stats.byType[category] || 0,
        limit,
        errors: categoryErrors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORY_ERRORS_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 에러 통계 초기화 API
 * POST /api/monitoring/reset-stats
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "에러 통계가 초기화되었습니다"
 * }
 */
router.post('/reset-stats', (req, res) => {
  try {
    errorHandler.resetStats();

    res.json({
      success: true,
      message: '에러 통계가 초기화되었습니다'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_STATS_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * 헬스 체크 API
 * GET /api/monitoring/health
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "status": "healthy",
 *     "uptime": 3600,
 *     "errorRate": 0.05,
 *     "recentErrors": 3
 *   }
 * }
 */
router.get('/health', (req, res) => {
  try {
    const stats = errorHandler.getStats();
    const uptime = process.uptime();
    const recentErrors = stats.recent.length;
    const errorRate = stats.total / uptime; // errors per second

    const status = errorRate > 1 ? 'unhealthy' : errorRate > 0.1 ? 'degraded' : 'healthy';

    res.json({
      success: true,
      data: {
        status,
        uptime: Math.floor(uptime),
        errorRate: errorRate.toFixed(4),
        totalErrors: stats.total,
        recentErrors,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: error.message
      }
    });
  }
});

module.exports = router;
