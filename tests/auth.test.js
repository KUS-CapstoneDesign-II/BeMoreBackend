const request = require('supertest');
const app = require('../app');
const { User, sequelize } = require('../models');

describe('Auth API Tests', () => {
  beforeAll(async () => {
    // 테스트 DB 동기화 (force: true는 테이블 재생성)
    // 주의: 프로덕션에서는 절대 사용 금지!
    if (process.env.NODE_ENV === 'test') {
      await sequelize.sync({ force: true });
    }
  });

  afterAll(async () => {
    // 연결 종료
    await sequelize.close();
  });

  afterEach(async () => {
    // 각 테스트 후 User 테이블 정리
    if (process.env.NODE_ENV === 'test') {
      await User.destroy({ where: {}, truncate: true });
    }
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
      expect(res.body.data.user.username).toBe('testuser');
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

    it('should reject duplicate username', async () => {
      // 첫 번째 사용자 생성
      await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'duplicateuser',
          email: 'user1@example.com',
          password: 'password123',
        });

      // 중복 유저명으로 재시도
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'duplicateuser',
          email: 'user2@example.com',
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
      expect(res.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
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
      expect(res.body.data.user.email).toBe('login@example.com');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
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
      expect(res.body.success).toBe(false);
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
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_REFRESH_TOKEN');
    });
  });

  describe('POST /api/auth/logout', () => {
    let refreshToken;
    let userId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'logouttest',
          email: 'logout@example.com',
          password: 'password123',
        });

      refreshToken = res.body.data.refreshToken;
      userId = res.body.data.user.id;
    });

    it('should logout and invalidate refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // DB에서 refreshToken이 null로 변경되었는지 확인
      const user = await User.findByPk(userId);
      expect(user.refreshToken).toBeNull();

      // 로그아웃 후 refresh token 재사용 불가 확인
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should handle logout with invalid token gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'invalid-token' });

      // 유효하지 않은 토큰이어도 로그아웃은 성공 처리
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_REFRESH_TOKEN');
    });
  });
});
