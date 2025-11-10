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
          message: 'Username or email already exists',
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
        message: err.message,
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
          message: 'Invalid email or password',
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
          message: 'Invalid email or password',
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
        message: err.message,
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
          message: 'Refresh token is required',
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
          message: 'Invalid or expired refresh token',
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
          message: 'Refresh token does not match',
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
          message: 'Refresh token is required',
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
        message: 'Logged out successfully',
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
      message: 'Logged out successfully',
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
          message: 'User not found',
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
          message: 'User not found',
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
            message: 'Username already exists',
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
