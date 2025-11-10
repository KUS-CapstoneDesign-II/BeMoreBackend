const jwt = require('jsonwebtoken');

/**
 * Optional JWT Auth middleware (enabled via AUTH_ENABLED=true)
 * - Checks Authorization: Bearer <token>
 * - Verifies token with JWT_SECRET
 * - Attaches req.user on success
 */
function optionalJwtAuth(req, res, next) {
  try {
    if (process.env.AUTH_ENABLED !== 'true') return next();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing bearer token' } });
    }
    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: { code: 'SERVER_MISCONFIG', message: 'JWT_SECRET not set' } });
    }
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token invalid or expired' } });
  }
}

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


