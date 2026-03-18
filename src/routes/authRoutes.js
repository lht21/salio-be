import express from 'express'
import { forgotPassword, login, register, resendOtp, resetPassword, verifyEmail } from '../controllers/authController.js'

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API xác thực, đăng ký, đăng nhập và khôi phục mật khẩu
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: vana123
 *               fullName:
 *                 type: string
 *                 example: Nguyen Van A
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "123456"
 *               role:
 *                 type: string
 *                 enum: [student, teacher]
 *                 default: student
 *                 example: student
 *                 description: Quyền của người dùng (mặc định là student)
 *     responses:
 *       201:
 *         description: Đăng ký thành công, vui lòng kiểm tra email để xác thực
 *       400:
 *         description: Email hoặc Username đã tồn tại hoặc dữ liệu không hợp lệ
 */
router.post('/register', register)

/**
 * @swagger
 * /api/auth/verify-email/{token}:
 *   get:
 *     summary: Xác thực email qua Token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token xác thực gửi qua email
 *     responses:
 *       200:
 *         description: Xác thực email thành công
 *       400:
 *         description: Token không hợp lệ hoặc đã hết hạn
 */
router.get('/verify-email/:token', verifyEmail)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập vào hệ thống
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về Token JWT
 *       401:
 *         description: Sai email hoặc mật khẩu
 */
router.post('/login', login)

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Yêu cầu khôi phục mật khẩu (Gửi mã OTP/Link)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Đã gửi hướng dẫn khôi phục vào email
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.post('/forgot-password', forgotPassword)

/**
 * @swagger
 * /api/auth/reset-password:
 *   patch:
 *     summary: Đặt lại mật khẩu mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token hoặc OTP xác thực
 *               password:
 *                 type: string
 *                 description: Mật khẩu mới
 *     responses:
 *       200:
 *         description: Mật khẩu đã được cập nhật thành công
 */
router.patch('/reset-password', resetPassword)

/**
 * @swagger
 * /api/auth/resend-password-otp:
 *   post:
 *     summary: Gửi lại mã OTP khôi phục mật khẩu
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã gửi lại mã thành công
 */
router.post('/resend-password-otp', resendOtp)

export default router;