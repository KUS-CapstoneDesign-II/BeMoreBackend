const express = require('express');
const { z } = require('zod');
const { validateBody } = require('../middlewares/zod');
const ctrl = require('../controllers/analyticsController');

const router = express.Router();

// Zod 스키마: Analytics Alert
const AlertSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  timestamp: z.string().datetime('Invalid ISO 8601 timestamp'),
  url: z.string().url('Invalid URL format'),
});

/**
 * POST /api/analytics/alert
 * 프론트엔드 성능 알림 수신
 *
 * Request Body:
 * {
 *   message: string,      // 성능 경고 메시지
 *   timestamp: string,    // ISO 8601 형식
 *   url: string           // 발생한 페이지 URL
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string
 * }
 */
router.post('/alert', validateBody(AlertSchema), ctrl.createAlert);

module.exports = router;
