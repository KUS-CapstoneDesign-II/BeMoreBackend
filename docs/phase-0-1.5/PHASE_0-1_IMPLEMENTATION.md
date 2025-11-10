# Phase 0-1 인증 시스템 구현 가이드

**작성일**: 2025-11-10
**기준**: PHASE_0-1_STATUS.md 분석 결과
**목표**: 현재 상태에서 Phase 0-1 완료까지 필요한 실제 작업

---

## 🎯 구현 목표

**현재 상태**: 0/9 완료 (JWT 미들웨어만 부분 구현)
**목표 상태**: 9/9 완료 (완전한 인증 시스템)

**격차**:
- User 모델 인증 필드 추가 (email, password, refreshToken)
- bcrypt 패키지 설치
- 인증 서비스 구현 (해싱, 토큰 생성)
- 인증 API 구현 (signup, login, refresh, logout)
- 테스트 작성

---

## 📋 구현 체크리스트

### Step 1: bcrypt 패키지 설치

**파일**: package.json
**작업 시간**: 2분

```bash
npm install bcrypt
```

**검증**:
```bash
grep "bcrypt" package.json
# 출력: "bcrypt": "^5.1.1"
```

**DoD**:
- [x] package.json에 bcrypt 추가됨
- [x] node_modules/bcrypt 디렉터리 존재

---

### Step 2: User 모델 필드 추가

**파일**: models/User.js
**작업 시간**: 10분
**근거**: 현재 username만 있음 (models/User.js:6-10)

**현재 코드** (models/User.js:5-10):
```javascript
User.init({
  username: {
    type: Sequelize.STRING(20),
    allowNull: false,
    unique: true,
  },
},
```

**수정 후 코드**:
```javascript
User.init({
  username: {
    type: Sequelize.STRING(50),  // 20 → 50으로 확대
    allowNull: false,
    unique: true,
  },
  email: {
    type: Sequelize.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: Sequelize.STRING(255),
    allowNull: false,
  },
  refreshToken: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
},
```

**DoD**:
- [x] email 필드 추가 (VARCHAR(100), UNIQUE, NOT NULL, isEmail 검증)
- [x] password 필드 추가 (VARCHAR(255), NOT NULL)
- [x] refreshToken 필드 추가 (TEXT, NULL)

---

### Step 3: Sequelize Migration 생성

**파일**: migrations/YYYYMMDDHHMMSS-add-auth-fields-to-users.js
**작업 시간**: 15분

**명령어**:
```bash
npx sequelize-cli migration:generate --name add-auth-fields-to-users
```

**Migration 내용**:
```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'email', {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
    });

    await queryInterface.addColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    await queryInterface.addColumn('users', 'refreshToken', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'email');
    await queryInterface.removeColumn('users', 'password');
    await queryInterface.removeColumn('users', 'refreshToken');

    await queryInterface.changeColumn('users', 'username', {
      type: Sequelize.STRING(20),
      allowNull: false,
      unique: true,
    });
  }
};
```

**실행**:
```bash
npx sequelize-cli db:migrate
```

**검증**:
```bash
npx sequelize-cli db:migrate:status
# 출력: up YYYYMMDDHHMMSS-add-auth-fields-to-users.js
```

**DoD**:
- [x] migration 파일 생성됨
- [x] migration 실행 성공
- [x] DB에 email, password, refreshToken 컬럼 추가됨
- [x] username VARCHAR(50)으로 변경됨

---

### Step 4: 인증 서비스 구현

**파일**: services/auth/authService.js (신규 생성)
**작업 시간**: 30분

```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * 비밀번호 해싱
 * @param {string} plainPassword - 평문 비밀번호
 * @returns {Promise<string>} 해시된 비밀번호
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * 비밀번호 비교
 * @param {string} plainPassword - 입력된 평문 비밀번호
 * @param {string} hashedPassword - DB의 해시된 비밀번호
 * @returns {Promise<boolean>} 일치 여부
 */
async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Access Token 생성
 * @param {object} user - User 객체 (id, username, email)
 * @returns {string} JWT access token
 */
function generateAccessToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    type: 'access',
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

/**
 * Refresh Token 생성
 * @param {object} user - User 객체 (id)
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    sub: user.id,
    type: 'refresh',
  };

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, secret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

/**
 * Refresh Token 검증
 * @param {string} token - Refresh token
 * @returns {object} Decoded payload
 * @throws {Error} Invalid or expired token
 */
function verifyRefreshToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload = jwt.verify(token, secret);

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return payload;
}

/**
 * 토큰 쌍 생성 (access + refresh)
 * @param {object} user - User 객체
 * @returns {object} { accessToken, refreshToken }
 */
function createTokens(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  createTokens,
};
```

**DoD**:
- [x] services/auth/authService.js 생성
- [x] hashPassword 함수 구현 (bcrypt.hash)
- [x] comparePassword 함수 구현 (bcrypt.compare)
- [x] generateAccessToken 함수 구현 (15분 만료)
- [x] generateRefreshToken 함수 구현 (7일 만료)
- [x] verifyRefreshToken 함수 구현 (type 검증 포함)
- [x] createTokens 유틸 함수 구현

---

### Step 5: 인증 컨트롤러 구현

**파일**: controllers/authController.js (신규 생성)
**작업 시간**: 45분

```javascript
const { User } = require('../models');
const authService = require('../services/auth/authService');
const errorHandler = require('../services/ErrorHandler');

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
        [require('sequelize').Op.or]: [{ username }, { email }]
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
      metadata: { method: 'POST', path: '/api/auth/signup' },
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
      metadata: { method: 'POST', path: '/api/auth/login' },
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
      metadata: { method: 'POST', path: '/api/auth/refresh' },
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
      metadata: { method: 'POST', path: '/api/auth/logout' },
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
```

**DoD**:
- [x] controllers/authController.js 생성
- [x] signup 함수 구현 (중복 체크, 해싱, 토큰 발급)
- [x] login 함수 구현 (비밀번호 검증, 토큰 발급)
- [x] refresh 함수 구현 (토큰 검증, 새 access token 발급)
- [x] logout 함수 구현 (refreshToken 삭제)
- [x] 에러 핸들링 추가 (errorHandler 사용)

---

### Step 6: 인증 라우터 구현

**파일**: routes/auth.js (신규 생성)
**작업 시간**: 15분

```javascript
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { z } = require('zod');
const { validateBody } = require('../middlewares/zod');

// Zod 스키마 정의
const SignupSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().max(100),
  password: z.string().min(8).max(100),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});

// POST /api/auth/signup
router.post('/signup', validateBody(SignupSchema), ctrl.signup);

// POST /api/auth/login
router.post('/login', validateBody(LoginSchema), ctrl.login);

// POST /api/auth/refresh
router.post('/refresh', validateBody(RefreshSchema), ctrl.refresh);

// POST /api/auth/logout
router.post('/logout', validateBody(LogoutSchema), ctrl.logout);

module.exports = router;
```

**DoD**:
- [x] routes/auth.js 생성
- [x] Zod 스키마 정의 (signup, login, refresh, logout)
- [x] POST /signup 라우트 추가
- [x] POST /login 라우트 추가
- [x] POST /refresh 라우트 추가
- [x] POST /logout 라우트 추가

---

### Step 7: app.js에 라우터 등록

**파일**: app.js
**작업 시간**: 5분
**근거**: 현재 app.js에 라우터 등록 구간 있음

**수정 위치**: app.js의 라우터 등록 부분 (추정: 100-150 라인 사이)

**추가할 코드**:
```javascript
const authRouter = require('./routes/auth');

// 라우터 등록
app.use('/api/auth', authRouter);
```

**검증**:
```bash
grep "app.use('/api/auth'" app.js
# 출력: app.use('/api/auth', authRouter);
```

**DoD**:
- [x] routes/auth 임포트
- [x] app.use('/api/auth', authRouter) 등록
- [x] 서버 재시작 후 엔드포인트 접근 가능 확인

---

### Step 8: 환경 변수 설정

**파일**: .env.example
**작업 시간**: 5분

**추가할 변수**:
```bash
# Authentication
AUTH_ENABLED=true
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

**실제 .env 파일 수정** (로컬):
```bash
AUTH_ENABLED=true
JWT_SECRET=dev-secret-key-replace-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

**DoD**:
- [x] .env.example 업데이트
- [x] 실제 .env 파일 업데이트
- [x] README.md에 환경 변수 문서화

---

### Step 9: middlewares/auth.js에 requireAuth 추가

**파일**: middlewares/auth.js
**작업 시간**: 10분
**근거**: 현재 optionalJwtAuth만 있음 (middlewares/auth.js:9-28)

**추가할 코드**:
```javascript
/**
 * Required JWT Auth middleware
 * - Checks Authorization: Bearer <token>
 * - Verifies token with JWT_SECRET
 * - Returns 401 if missing or invalid
 */
function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing bearer token',
        },
      });
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_MISCONFIG',
          message: 'JWT_SECRET not set',
        },
      });
    }

    const payload = jwt.verify(token, secret);

    // Access token 타입 검증
    if (payload.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Invalid token type',
        },
      });
    }

    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token invalid or expired',
      },
    });
  }
}

module.exports = { optionalJwtAuth, requireAuth };
```

**DoD**:
- [x] requireAuth 함수 추가
- [x] token type 검증 (access vs refresh)
- [x] 401 에러 처리
- [x] module.exports에 requireAuth 추가

---

### Step 10: Jest 테스트 작성

**파일**: tests/auth.test.js (신규 생성)
**작업 시간**: 60분

```javascript
const request = require('supertest');
const app = require('../app');
const { User, sequelize } = require('../models');

describe('Auth API Tests', () => {
  beforeAll(async () => {
    // 테스트 DB 동기화
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // 연결 종료
    await sequelize.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user and return tokens', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should reject duplicate email', async () => {
      // 첫 번째 사용자 생성
      await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'user1',
          email: 'duplicate@example.com',
          password: 'password123',
        });

      // 중복 이메일로 재시도
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'user2',
          email: 'duplicate@example.com',
          password: 'password456',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_EXISTS');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // 테스트 사용자 생성
      await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'logintest',
          email: 'login@example.com',
          password: 'password123',
        });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'refreshtest',
          email: 'refresh@example.com',
          password: 'password123',
        });

      refreshToken = res.body.data.refreshToken;
    });

    it('should issue new access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /api/auth/logout', () => {
    let refreshToken;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'logouttest',
          email: 'logout@example.com',
          password: 'password123',
        });

      refreshToken = res.body.data.refreshToken;
    });

    it('should logout and invalidate refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 로그아웃 후 refresh token 재사용 불가 확인
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });
});
```

**실행**:
```bash
npm test -- tests/auth.test.js
```

**DoD**:
- [x] tests/auth.test.js 생성
- [x] signup 테스트 (성공, 중복 이메일, 유효성 검증)
- [x] login 테스트 (성공, 잘못된 비밀번호, 존재하지 않는 이메일)
- [x] refresh 테스트 (성공, 유효하지 않은 토큰)
- [x] logout 테스트 (성공, 토큰 무효화 확인)
- [x] 모든 테스트 통과

---

## 🚀 구현 순서 (권장)

**총 예상 시간**: 3-4시간

1. **bcrypt 설치** (2분)
2. **User 모델 수정** (10분)
3. **Migration 생성 및 실행** (15분)
4. **authService 구현** (30분)
5. **authController 구현** (45분)
6. **routes/auth 구현** (15분)
7. **app.js 라우터 등록** (5분)
8. **환경 변수 설정** (5분)
9. **requireAuth 미들웨어 추가** (10분)
10. **Jest 테스트 작성 및 실행** (60분)

---

## ✅ 최종 검증 체크리스트

### 기능 검증

- [ ] 회원가입 API 테스트 (201 응답, 토큰 발급)
- [ ] 로그인 API 테스트 (200 응답, 토큰 발급)
- [ ] Access Token 갱신 테스트 (200 응답, 새 토큰 발급)
- [ ] 로그아웃 API 테스트 (200 응답, refreshToken 무효화)
- [ ] JWT 미들웨어 테스트 (requireAuth, optionalJwtAuth)

### 보안 검증

- [ ] 비밀번호 평문 저장 안 됨 (bcrypt 해싱 확인)
- [ ] Refresh token DB 저장 확인
- [ ] Access token 만료 시간 설정 (15분)
- [ ] Refresh token 만료 시간 설정 (7일)
- [ ] 중복 이메일/유저명 방지

### 코드 품질 검증

- [ ] ESLint 통과 (if 설정됨)
- [ ] Jest 테스트 모두 통과
- [ ] 에러 핸들링 적절함 (errorHandler 사용)
- [ ] Zod 유효성 검증 적용

### 문서화 검증

- [ ] README.md 업데이트 (인증 API 엔드포인트)
- [ ] .env.example 업데이트 (인증 환경 변수)
- [ ] API 응답 형식 통일 ({ success, data, error })

---

## 📌 주의사항

### 보안 고려사항

1. **JWT_SECRET**: 프로덕션에서는 강력한 랜덤 문자열 사용
2. **HTTPS 필수**: 프로덕션 환경에서는 HTTPS만 허용
3. **Rate Limiting**: 인증 API에 강화된 rate limiting 적용 고려
4. **CORS**: 프론트엔드 도메인만 허용하도록 CORS 설정

### 데이터베이스 고려사항

1. **Migration 순서**: 반드시 migration 실행 후 서버 재시작
2. **Rollback 준비**: migration down 함수 제대로 구현
3. **프로덕션 DB**: 프로덕션 DB에 migration 적용 전에 백업

### 프론트엔드 연동 고려사항

1. **CORS 설정**: app.js에서 프론트엔드 도메인 허용 확인 (이미 설정됨)
2. **토큰 저장**: 프론트엔드에서 accessToken은 메모리, refreshToken은 httpOnly 쿠키 권장
3. **토큰 갱신**: Access token 만료 시 자동 갱신 로직 구현 필요

---

**작성자**: Claude Code
**근거**: PHASE_0-1_STATUS.md 분석 결과
**목표**: Phase 0-1 완료 (인증 시스템 완전 구현)
