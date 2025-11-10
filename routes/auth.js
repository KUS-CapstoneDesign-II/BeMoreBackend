const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { z } = require('zod');
const { validateBody } = require('../middlewares/zod');
const { requireAuth } = require('../middlewares/auth');

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

const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  profileImage: z.string().url().optional().or(z.literal(null)),
});

// Public routes
// POST /api/auth/signup
router.post('/signup', validateBody(SignupSchema), ctrl.signup);

// POST /api/auth/login
router.post('/login', validateBody(LoginSchema), ctrl.login);

// POST /api/auth/refresh
router.post('/refresh', validateBody(RefreshSchema), ctrl.refresh);

// POST /api/auth/logout
router.post('/logout', validateBody(LogoutSchema), ctrl.logout);

// Protected routes (requireAuth)
// GET /api/auth/me
router.get('/me', requireAuth, ctrl.getMe);

// PUT /api/auth/profile
router.put('/profile', requireAuth, validateBody(UpdateProfileSchema), ctrl.updateProfile);

module.exports = router;
