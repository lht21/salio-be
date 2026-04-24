import express from 'express';

import {
  sendRegisterOtp,
  sendForgotPasswordOtp,
  verifyOtp,
  register,
  login,
  socialLogin,
  logout,
  verifyResetOtp,
  resetPassword,
  refreshToken,
} from '../controllers/authController.js';
import {
  sendOtpRules,
  forgotPasswordRules,
  verifyOtpRules,
  registerRules,
  socialLoginRules,
  loginRules,
  resetPasswordRules,
} from '../middlewares/validation.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register/send-otp:
 *   post:
 *     summary: Gửi OTP để đăng ký tài khoản mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailOtpRequest'
 *     responses:
 *       200:
 *         description: Gửi OTP thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc đang trong thời gian chờ
 */
router.post('/register/send-otp', sendOtpRules, sendRegisterOtp);

/**
 * @swagger
 * /api/auth/register/verify-otp:
 *   post:
 *     summary: Xác minh OTP đăng ký
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOtpRequest'
 *     responses:
 *       200:
 *         description: Xác minh OTP thành công
 *       400:
 *         description: OTP sai, hết hạn, hoặc không tồn tại
 */
router.post('/register/verify-otp', verifyOtpRules, verifyOtp);

/**
 * @swagger
 * /api/auth/register/create-account:
 *   post:
 *     summary: Tạo tài khoản sau khi xác minh OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Chưa xác minh OTP hoặc dữ liệu không hợp lệ
 *       409:
 *         description: Email hoặc username đã tồn tại
 */
router.post('/register/create-account', registerRules, register);

/**
 * @swagger
 * /api/auth/social-login:
 *   post:
 *     summary: Đăng nhập bằng Google hoặc Apple
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SocialLoginRequest'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       401:
 *         description: Token từ nhà cung cấp không hợp lệ
 */
router.post('/social-login', socialLoginRules, socialLogin);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập bằng email và mật khẩu
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       401:
 *         description: Sai thông tin đăng nhập
 */
router.post('/login', loginRules, login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất tài khoản hiện tại
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *       401:
 *         description: Chưa xác thực
 */
router.post('/logout', protect, logout);

/**
 * @swagger
 * /api/auth/forgot-password/send-otp:
 *   post:
 *     summary: Gửi OTP quên mật khẩu
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailOtpRequest'
 *     responses:
 *       200:
 *         description: Xử lý gửi OTP thành công
 */
router.post('/forgot-password/send-otp', forgotPasswordRules, sendForgotPasswordOtp);

/**
 * @swagger
 * /api/auth/forgot-password/verify-otp:
 *   post:
 *     summary: Xác minh OTP quên mật khẩu
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOtpRequest'
 *     responses:
 *       200:
 *         description: Xác minh OTP thành công
 *       400:
 *         description: OTP sai hoặc hết hạn
 */
router.post('/forgot-password/verify-otp', verifyOtpRules, verifyResetOtp);

/**
 * @swagger
 * /api/auth/forgot-password/reset:
 *   post:
 *     summary: Đặt lại mật khẩu sau khi xác minh OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *       400:
 *         description: OTP reset khong hop le hoac da het han
 */
router.post('/forgot-password/reset', resetPasswordRules, resetPassword);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Cấp mới access token
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Cấp mới token thành công
 *       401:
 *         description: Refresh token không hợp lệ
 */
router.post('/refresh-token', refreshToken);

export default router;
