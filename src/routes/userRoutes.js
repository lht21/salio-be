import express from 'express'
import { 
  getAllUsers, 
  getUserProfile, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  updateUserProfile,
  uploadAvatar 
} from '../controllers/userController.js';
import { protect, admin, teacherOrAdmin } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/logMiddleware.js';

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Quản lý thông tin người dùng, hồ sơ cá nhân và phân quyền hệ thống
 */

router.use(logActivity)

// --- ROUTES CHO NGƯỜI DÙNG HIỆN TẠI (PROFILE) ---

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Lấy thông tin hồ sơ của người dùng đang đăng nhập
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về thông tin cá nhân thành công
 *       401:
 *         description: Chưa đăng nhập hoặc Token không hợp lệ
 */
router.get('/profile', protect, getUserProfile)

/**
 * @swagger
 * /api/user/profile:
 *   patch:
 *     summary: Cập nhật thông tin hồ sơ của chính mình
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
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật hồ sơ thành công
 */
router.patch('/profile', protect, updateUserProfile)

/**
 * @swagger
 * /api/user/avatar:
 *   post:
 *     summary: Upload hoặc cập nhật ảnh đại diện (Avatar)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh đại diện (jpg, png...)
 *     responses:
 *       200:
 *         description: Cập nhật ảnh đại diện thành công
 */
router.post('/avatar', protect, uploadAvatar) 


// --- ADMIN ONLY ROUTES (QUẢN LÝ TÀI KHOẢN) ---

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Lấy danh sách toàn bộ người dùng (Chỉ Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về mảng danh sách người dùng
 *       403:
 *         description: Không có quyền Admin
 */
router.get('/', protect, admin, getAllUsers)

/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết một người dùng theo ID (Chỉ Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng cần xem
 *     responses:
 *       200:
 *         description: Thông tin chi tiết người dùng
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.get('/:id', protect, admin, getUserById)

/**
 * @swagger
 * /api/user/{id}:
 *   delete:
 *     summary: Xóa người dùng khỏi hệ thống (Chỉ Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa người dùng thành công
 */
router.delete('/:id', protect, admin, deleteUser)

/**
 * @swagger
 * /api/user:
 *   post:
 *     summary: Admin tạo tài khoản người dùng mới thủ công
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, teacher, admin]
 *     responses:
 *       201:
 *         description: Tạo người dùng thành công
 */
router.post('/', protect, admin, createUser)


// --- ROUTES CHO TEACHER HOẶC ADMIN ---

/**
 * @swagger
 * /api/user/{id}:
 *   patch:
 *     summary: Cập nhật thông tin người dùng bất kỳ (Admin hoặc Teacher)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, teacher, admin]
 *     responses:
 *       200:
 *         description: Cập nhật người dùng thành công
 */
router.patch('/:id', protect, teacherOrAdmin, updateUser)

export default router;