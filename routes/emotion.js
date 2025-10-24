const express = require('express');
const router = express.Router();
const { analyzeEmotion } = require('../services/gemini/gemini');
const { z } = require('zod');
const { validateBody } = require('../middlewares/zod');

const EmotionBodySchema = z.object({
  text: z.string().min(1, 'text is required').max(2000)
});

// POST /api/emotion
router.post('/', validateBody(EmotionBodySchema), async (req, res) => {
  try {
    const { text } = req.body;
    const emotion = await analyzeEmotion(text);
    return res.status(200).json({ success: true, data: { emotion } });
  } catch (error) {
    console.error('Emotion analysis API error:', error);
    return res.status(500).json({ success: false, error: { code: 'EMOTION_ANALYSIS_ERROR', message: '감정 분석 중 서버 오류가 발생했습니다.' } });
  }
});

module.exports = router;


