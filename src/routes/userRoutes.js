import express from 'express';
const router = express.Router();

import {
  getMe,
  updateProfile,
  updateAvatar,
  changePassword,
  updatePreferences,
  getMyStats,
  getAllUsers,
  getUserDetails,
  updateUser,
  updateUserStatus,
  deleteUser,
  getUserProgress,
  getUserSubscription
} from '../controllers/userController.js';

import { protect, admin } from '../middlewares/auth.js';

import {
  updateProfileRules,
  changePasswordRules
} from '../middlewares/validation.js';

import upload from '../middlewares/upload.js';

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Lấy thông tin tài khoản đang đăng nhập
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về public profile của user
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/v1/users/me:
 *   patch:
 *     summary: Cập nhật username của tài khoản đang đăng nhập
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: salio_user_2
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       409:
 *         description: Username đã tồn tại
 */
router.patch('/me', protect, updateProfileRules, updateProfile);

/**
 * @swagger
 * /api/v1/users/me/avatar:
 *   post:
 *     summary: Cập nhật avatar của tài khoản đang đăng nhập
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh jpeg, jpg, png, gif hoặc webp; tối đa 5MB
 *     responses:
 *       200:
 *         description: Trả về data.avatarUrl
 *       400:
 *         description: Thiếu file hoặc file không hợp lệ
 */
router.post('/me/avatar', protect, upload.single('avatar'), updateAvatar);

/**
 * @swagger
 * /api/v1/users/me/password:
 *   patch:
 *     summary: Đổi mật khẩu tài khoản đang đăng nhập
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmNewPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *               confirmNewPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu hiện tại sai hoặc data không hợp lệ
 */
router.patch('/me/password', protect, changePasswordRules, changePassword);

/**
 * @swagger
 * /api/v1/users/me/preferences:
 *   patch:
 *     summary: Cập nhật tùy chọn ứng dụng
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Trả về data.preferences
 */
router.patch('/me/preferences', protect, updateProfileRules, updatePreferences);

/**
 * @swagger
 * /api/v1/users/me/stats:
 *   get:
 *     summary: Lấy thống kê học tập cá nhân
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về gamification, statistics và các count
 *       404:
 *         description: Chưa có UserProgress
 */
router.get('/me/stats', protect, getMyStats);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Admin lấy danh sách users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, admin, teacher]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isBanned
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Trả về users, total, page, pages
 *       403:
 *         description: Không phải admin
 */
router.get('/', protect, admin, getAllUsers);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Admin lấy chi tiết user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về user
 *       404:
 *         description: Không tìm thấy user
 */
router.get('/:userId', protect, admin, getUserDetails);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   patch:
 *     summary: Admin cập nhật user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               level:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, admin, teacher]
 *     responses:
 *       200:
 *         description: Cập nhật user thành công
 *       409:
 *         description: Username đã tồn tại
 */
router.patch('/:userId', protect, admin, updateUser);

/**
 * @swagger
 * /api/v1/users/{userId}/status:
 *   patch:
 *     summary: Admin khóa/mở tài khoản
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *               isBanned:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Trả về isActive và isBanned mới
 */
router.patch('/:userId/status', protect, admin, updateUserStatus);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   delete:
 *     summary: Admin xóa user
 *     description: Xóa user, avatar trên S3 nếu có, và UserProgress liên quan.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa user thành công
 *       404:
 *         description: Không tìm thấy user
 */
router.delete('/:userId', protect, admin, deleteUser);

/**
 * @swagger
 * /api/v1/users/{userId}/progress:
 *   get:
 *     summary: Admin xem tiến độ học tập của user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về UserProgress đã populate savedVocabularies và completedLessons
 *       404:
 *         description: Không tìm thấy progress
 */
router.get('/:userId/progress', protect, admin, getUserProgress);

/**
 * @swagger
 * /api/v1/users/{userId}/subscription:
 *   get:
 *     summary: Admin xem gói cước của user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về subscription của user
 *       404:
 *         description: Không tìm thấy user
 */
router.get('/:userId/subscription', protect, admin, getUserSubscription);

export default router;