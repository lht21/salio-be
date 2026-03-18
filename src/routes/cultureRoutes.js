import express from 'express';
import {
    getCategories,
    getCultureItems,
    getCultureItem,
    createCultureItem,
    updateCultureItem,
    submitForApproval,
    getCultureItemsForAdmin,
    approveCultureItem,
    rejectCultureItem,
    getMyCultureItems,
    deleteCultureItem,
     getCultures,
  getCultureById,
  createCulture,
  updateCulture,
  deleteCulture,
  togglePremium,
  uploadCultureImage
} from '../controllers/cultureController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { protect, teacherOrAdmin } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/logMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Culture
 *   description: Quản lý nội dung văn hóa, tin tức văn hóa và danh mục liên quan
 */

// --- PUBLIC ROUTES (Học viên) ---

/**
 * @swagger
 * /api/culture/categories:
 *   get:
 *     summary: Lấy danh sách các danh mục văn hóa
 *     tags: [Culture]
 *     responses:
 *       200:
 *         description: Trả về mảng các danh mục
 */
router.get('/categories', getCategories);

/**
 * @swagger
 * /api/culture/items:
 *   get:
 *     summary: Lấy danh sách tất cả các mục văn hóa (đã duyệt/công khai)
 *     tags: [Culture]
 *     responses:
 *       200:
 *         description: Trả về danh sách mục văn hóa
 */
router.get('/items', getCultureItems);

/**
 * @swagger
 * /api/culture/items/{id}:
 *   get:
 *     summary: Lấy chi tiết một mục văn hóa theo ID
 *     tags: [Culture]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết mục văn hóa
 */
router.get('/items/:id', getCultureItem);

// --- TEACHER ROUTES (Yêu cầu Token) ---

/**
 * @swagger
 * /api/culture/items:
 *   post:
 *     summary: Giáo viên tạo mục văn hóa mới
 *     tags: [Culture]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đã tạo thành công
 */
router.post('/items', authenticateToken, createCultureItem);

/**
 * @swagger
 * /api/culture/items/{id}:
 *   put:
 *     summary: Cập nhật mục văn hóa của giáo viên
 *     tags: [Culture]
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
 *         description: Cập nhật thành công
 */
router.put('/items/:id', authenticateToken, updateCultureItem);

/**
 * @swagger
 * /api/culture/items/{id}/submit:
 *   post:
 *     summary: Gửi mục văn hóa lên để chờ phê duyệt
 *     tags: [Culture]
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
 *         description: Đã gửi phê duyệt thành công
 */
router.post('/items/:id/submit', authenticateToken, submitForApproval);

/**
 * @swagger
 * /api/culture/my-items:
 *   get:
 *     summary: Lấy danh sách các mục văn hóa do chính giáo viên này tạo
 *     tags: [Culture]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách mục của tôi
 */
router.get('/my-items', authenticateToken, getMyCultureItems);

/**
 * @swagger
 * /api/culture/items/{id}:
 *   delete:
 *     summary: Xóa mục văn hóa của giáo viên
 *     tags: [Culture]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/items/:id', authenticateToken, deleteCultureItem);

// --- ADMIN ROUTES ---

/**
 * @swagger
 * /api/culture/admin/items:
 *   get:
 *     summary: Admin lấy danh sách các mục cần xem xét
 *     tags: [Culture]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách dành cho admin
 */
router.get('/admin/items', authenticateToken, getCultureItemsForAdmin);

/**
 * @swagger
 * /api/culture/admin/items/{id}/approve:
 *   post:
 *     summary: Phê duyệt mục văn hóa
 *     tags: [Culture]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/admin/items/:id/approve', authenticateToken, approveCultureItem);

/**
 * @swagger
 * /api/culture/admin/items/{id}/reject:
 *   post:
 *     summary: Từ chối mục văn hóa
 *     tags: [Culture]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/admin/items/:id/reject', authenticateToken, rejectCultureItem);

// --- CULTURES CRUD (GENERAL) ---

/**
 * @swagger
 * /api/culture:
 *   get:
 *     summary: Lấy tất cả bài văn hóa (Dùng cho danh sách chung)
 *     tags: [Culture]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', getCultures);

/**
 * @swagger
 * /api/culture/{id}:
 *   get:
 *     summary: Lấy bài văn hóa theo ID
 *     tags: [Culture]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', getCultureById);

/**
 * @swagger
 * /api/culture/upload:
 *   post:
 *     summary: Upload ảnh cho bài văn hóa (Teacher/Admin)
 *     tags: [Culture]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload ảnh thành công
 */
router.post('/upload', protect, teacherOrAdmin, uploadCultureImage);

/**
 * @swagger
 * /api/culture:
 *   post:
 *     summary: Tạo bài văn hóa mới (Teacher/Admin)
 *     tags: [Culture]
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
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo bài thành công
 */
router.post('/', protect, teacherOrAdmin, logActivity, createCulture);

/**
 * @swagger
 * /api/culture/{id}:
 *   put:
 *     summary: Cập nhật bài văn hóa (Teacher/Admin)
 *     tags: [Culture]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/:id', protect, teacherOrAdmin, logActivity, updateCulture);

/**
 * @swagger
 * /api/culture/{id}/toggle-premium:
 *   patch:
 *     summary: Bật/Tắt trạng thái Premium cho bài văn hóa
 *     tags: [Culture]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/:id/toggle-premium', protect, teacherOrAdmin, logActivity, togglePremium);

/**
 * @swagger
 * /api/culture/{id}:
 *   delete:
 *     summary: Xóa bài văn hóa
 *     tags: [Culture]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:id', protect, teacherOrAdmin, logActivity, deleteCulture);

export default router;