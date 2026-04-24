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

// Import middleware xác thực
import { protect, admin } from '../middlewares/auth.js';

// Import các rules validation (Giả định bạn đã khai báo trong validation.js)
import {
  updateProfileRules,
  changePasswordRules
} from '../middlewares/validation.js';

// Import middleware upload ảnh
import upload from '../middlewares/upload.js';

// ─── GET /api/v1/users/me ─────────────────────────────────────────────────────
router.get('/me', protect, getMe);

// ─── PATCH /api/v1/users/me ───────────────────────────────────────────────────
router.patch('/me', protect, updateProfileRules, updateProfile);

// ─── POST /api/v1/users/me/avatar ─────────────────────────────────────────────
router.post('/me/avatar', protect, upload.single('avatar'), updateAvatar);

// ─── PATCH /api/v1/users/me/password ──────────────────────────────────────────
router.patch('/me/password', protect, changePasswordRules, changePassword);

// ─── PATCH /api/v1/users/me/preferences ───────────────────────────────────────
router.patch('/me/preferences', protect, updateProfileRules, updatePreferences);

// ─── GET /api/v1/users/me/stats ───────────────────────────────────────────────
router.get('/me/stats', protect, getMyStats);

// ==============================================================================
// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
// ==============================================================================

// Lấy danh sách người dùng
router.get('/', protect, admin, getAllUsers);

// Xem chi tiết một người dùng
router.get('/:userId', protect, admin, getUserDetails);

// Cập nhật tài khoản người dùng
router.patch('/:userId', protect, admin, updateUser);

// Khóa/mở tài khoản
router.patch('/:userId/status', protect, admin, updateUserStatus);

// Xóa hoặc vô hiệu hóa tài khoản
router.delete('/:userId', protect, admin, deleteUser);

// Xem tiến độ học của học sinh
router.get('/:userId/progress', protect, admin, getUserProgress);

// Xem gói cước của học sinh
router.get('/:userId/subscription', protect, admin, getUserSubscription);

export default router;