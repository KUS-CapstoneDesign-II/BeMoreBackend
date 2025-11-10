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
