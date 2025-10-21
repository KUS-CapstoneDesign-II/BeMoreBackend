const express = require("express");
const router = express.Router();
const { User, Counseling } = require('../models'); // Sequelize 모델 가져오기
const { Op } = require("sequelize");

/*
예시 요청 body:
{
  "userId": "abc123", 
  "responses": {
    "moodToday": "😊 좋음",
    "daySummary": "바쁨",
    "frequentEmotion": "불안",
    "goalOfCounseling": "감정 이해",
    "reasonForCounseling": "인간관계 문제 때문에",
    "reasonForCounselingOther": null
  },
  "submittedAt": "2025-10-20T03:10:00Z"
}

*/
router.post('/', async (req, res) => {
  try {
    const { userId, responses, submittedAt } = req.body || {};


    // 기본 유효성 검사
    if (!userId || typeof responses !== 'object') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'userId와 responses(사전 문진 응답)는 필수입니다' }
      });
    }

    // 1. User 존재 확인 또는 생성
    let user = await User.findOne({ where: {id : userId } });
    if (!user) {
      // TODO : 추후 회원 가입 및 로그인 로직으로 수정 예정
      user = await User.create({ userId, username: `User_${userId}` });
    }


    // 2. Counseling 데이터 저장
    const counseling = await Counseling.create({
      userId: user.id,
      responses,
      submittedAt: submittedAt ? new Date(submittedAt) : new Date()
    });

    res.status(201).json({
      success: true,
      data: {
        userId: user.userId,
        counseling,
        counselingId: counseling.id
      }
    });




  } catch (error) {
    console.error("사전 상담 처리 오류", error);
    res.status(500).json({
      sucess: false,
      error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다' }
    });
  }


});

// GET /api/preCounsel/:userId/:counselingId?
router.get('/:userId/:counselingId', async (req, res) => {
  try {
    const { userId, counselingId } = req.params;

    // 해당 유저 조회
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: '해당 유저를 찾을 수 없습니다.' }
      });
    }

    let result;
    if (counselingId) {
      // 특정 상담 조회
      result = await Counseling.findOne({
        where: {
          id: counselingId,
          userId: user.id
        }
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '해당 상담을 찾을 수 없습니다.' }
        });
      }
    }

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' }
    });
  }
});

module.exports = router;
