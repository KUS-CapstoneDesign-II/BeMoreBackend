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

// Zod 스키마: Web Vitals
const VitalsSchema = z.object({
  metric: z.enum(['CLS', 'FCP', 'FID', 'LCP', 'TTFB', 'INP'], 'Invalid metric type'),
  value: z.number().nonnegative('Value must be non-negative'),
  pathname: z.string().min(1, 'Pathname is required'),
  id: z.string().optional(),
  navigationType: z.string().optional(),
});

/**
 * POST /api/analytics/vitals
 * 프론트엔드 Core Web Vitals 메트릭 수신
 *
 * Request Body:
 * {
 *   metric: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB' | 'INP',  // Web Vitals 메트릭 타입
 *   value: number,                                            // 메트릭 값
 *   pathname: string,                                         // 발생 페이지 경로
 *   id?: string,                                              // 메트릭 고유 ID
 *   navigationType?: string                                   // 네비게이션 타입
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message?: string
 * }
 */
router.post('/vitals', validateBody(VitalsSchema), ctrl.createVitals);

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
