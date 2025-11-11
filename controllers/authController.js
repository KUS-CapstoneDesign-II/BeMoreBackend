const { User } = require('../models');
const authService = require('../services/auth/authService');
const errorHandler = require('../services/ErrorHandler');
const { Op } = require('sequelize');

/**
 * POST /api/auth/signup
 * 회원가입
 */
async function signup(req, res) {
  try {
    const { username, email, password } = req.body;

    // 중복 체크
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: '이미 사용 중인 이메일입니다.',
          requestId: req.requestId,
        },
      });
    }

    // 비밀번호 해싱
    const hashedPassword = await authService.hashPassword(password);

    // 사용자 생성
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // 토큰 생성
    const { accessToken, refreshToken } = authService.createTokens(user);

    // Refresh token DB 저장
    user.refreshToken = refreshToken;
    await user.save();

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    errorHandler.handle(err, {
      module: 'auth',
      level: errorHandler.levels.ERROR,
      metadata: { method: 'POST', path: '/api/auth/signup', requestId: req.requestId },
    });
    return res.status(500).json({
      success: false,
      error: {
        code: 'SIGNUP_ERROR',
        message: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        requestId: req.requestId,
      },
    });
  }
}

/**
 * POST /api/auth/login
 * 로그인
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // 사용자 조회
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
          requestId: req.requestId,
        },
      });
    }

    // 비밀번호 검증
    const isValid = await authService.comparePassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
          requestId: req.requestId,
        },
      });
    }

    // 토큰 생성
    const { accessToken, refreshToken } = authService.createTokens(user);

    // Refresh token DB 저장
    user.refreshToken = refreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    errorHandler.handle(err, {
      module: 'auth',
      level: errorHandler.levels.ERROR,
      metadata: { method: 'POST', path: '/api/auth/login', requestId: req.requestId },
    });
    return res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        requestId: req.requestId,
      },
    });
  }
}

/**
 * POST /api/auth/refresh
 * Access Token 재발급
 */
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: '리프레시 토큰이 필요합니다.',
          requestId: req.requestId,
        },
      });
    }

    // Refresh token 검증
    let payload;
    try {
      payload = authService.verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: '유효하지 않거나 만료된 리프레시 토큰입니다.',
          requestId: req.requestId,
        },
      });
    }

    // 사용자 조회
    const user = await User.findByPk(payload.sub);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: '리프레시 토큰이 일치하지 않습니다.',
          requestId: req.requestId,
        },
      });
    }

    // 새 Access Token 생성
    const newAccessToken = authService.generateAccessToken(user);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (err) {
    errorHandler.handle(err, {
      module: 'auth',
      level: errorHandler.levels.ERROR,
      metadata: { method: 'POST', path: '/api/auth/refresh', requestId: req.requestId },
    });
    return res.status(500).json({
      success: false,
      error: {
        code: 'REFRESH_ERROR',
        message: err.message,
      },
    });
  }
}

/**
 * POST /api/auth/logout
 * 로그아웃 (Refresh Token 삭제)
 */
async function logout(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: '리프레시 토큰이 필요합니다.',
          requestId: req.requestId,
        },
      });
    }

    // Refresh token 검증 (유효하지 않아도 계속 진행)
    let payload;
    try {
      payload = authService.verifyRefreshToken(refreshToken);
    } catch (err) {
      // Token이 만료되었거나 유효하지 않아도 로그아웃은 성공 처리
      return res.status(200).json({
        success: true,
        message: '로그아웃되었습니다.',
      });
    }

    // 사용자 조회 후 refreshToken 삭제
    const user = await User.findByPk(payload.sub);

    if (user && user.refreshToken === refreshToken) {
      user.refreshToken = null;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: '로그아웃되었습니다.',
    });
  } catch (err) {
    errorHandler.handle(err, {
      module: 'auth',
      level: errorHandler.levels.ERROR,
      metadata: { method: 'POST', path: '/api/auth/logout', requestId: req.requestId },
    });
    return res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: err.message,
      },
    });
  }
}

/**
 * GET /api/auth/me
 * 현재 로그인된 사용자 정보 조회
 */
async function getMe(req, res) {
  try {
    // req.user는 requireAuth 미들웨어에서 설정됨
    const userId = req.user.sub;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'profileImage'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '사용자를 찾을 수 없습니다.',
          requestId: req.requestId,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          profileImage: user.profileImage,
        },
      },
    });
  } catch (err) {
    errorHandler.handle(err, {
      module: 'auth',
      level: errorHandler.levels.ERROR,
      metadata: { method: 'GET', path: '/api/auth/me', requestId: req.requestId },
    });
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_ME_ERROR',
        message: err.message,
      },
    });
  }
}

/**
 * PUT /api/auth/profile
 * 사용자 프로필 업데이트
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.sub;
    const { username, profileImage } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '사용자를 찾을 수 없습니다.',
          requestId: req.requestId,
        },
      });
    }

    // username 중복 체크 (변경하려는 경우만)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USERNAME_EXISTS',
            message: '이미 사용 중인 사용자 이름입니다.',
            requestId: req.requestId,
          },
        });
      }
      user.username = username;
    }

    // profileImage 업데이트
    if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          profileImage: user.profileImage,
        },
      },
    });
  } catch (err) {
    errorHandler.handle(err, {
      module: 'auth',
      level: errorHandler.levels.ERROR,
      metadata: { method: 'PUT', path: '/api/auth/profile', requestId: req.requestId },
    });
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PROFILE_ERROR',
        message: err.message,
      },
    });
  }
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
};
