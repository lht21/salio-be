import express from 'express';
const router = express.Router();

import { sendRegisterOtp, sendForgotPasswordOtp, verifyOtp, register, login, socialLogin, logout, verifyResetOtp, resetPassword, refreshToken } from '../controllers/authController.js';

import { sendOtpRules, forgotPasswordRules, verifyOtpRules, registerRules, socialLoginRules, loginRules, resetPasswordRules } from '../middlewares/validation.js';

import { protect } from '../middlewares/auth.js';

// POST /api/v1/auth/register/send-otp
router.post('/register/send-otp', sendOtpRules, sendRegisterOtp);

// POST /api/v1/auth/register/verify-otp
router.post('/register/verify-otp', verifyOtpRules, verifyOtp);

// POST /api/v1/auth/register/create-account
router.post('/register/create-account', registerRules, register);

// POST /api/v1/auth/social-login
router.post('/social-login', socialLoginRules, socialLogin);

// POST /api/v1/auth/login
router.post('/login', loginRules, login);

// POST /api/v1/auth/logout  (protected)
router.post('/logout', protect, logout);

// ─── Forgot / Reset Password (không cần đăng nhập) ───────────────────────────
// Step 1: POST /api/v1/auth/forgot-password/send-otp
router.post('/forgot-password/send-otp', forgotPasswordRules, sendForgotPasswordOtp);
// Step 2: xác minh OTP reset
router.post('/forgot-password/verify-otp', verifyOtpRules, verifyResetOtp);
// Step 3: đặt mật khẩu mới
router.post('/forgot-password/reset', resetPasswordRules, resetPassword);

// POST /api/v1/auth/refresh-token
router.post('/refresh-token', refreshToken);

export default router;