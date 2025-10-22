const express = require('express');
const router = express.Router();
const { analyzeEmotion } = require('../services/gemini/gemini');

// POST /api/emotion
router.post('/', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '분석할 텍스트가 필요합니다.' } });
    }
    const emotion = await analyzeEmotion(String(text));
    return res.status(200).json({ success: true, data: { emotion } });
  } catch (error) {
    console.error('Emotion analysis API error:', error);
    return res.status(500).json({ success: false, error: { code: 'EMOTION_ANALYSIS_ERROR', message: '감정 분석 중 서버 오류가 발생했습니다.' } });
  }
});

module.exports = router;


