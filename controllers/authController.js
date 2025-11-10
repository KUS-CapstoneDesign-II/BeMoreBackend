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

module.exports = {
  signup,
  login,
  refresh,
  logout,
};
