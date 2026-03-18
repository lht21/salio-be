import express from 'express';
import {
    getPendingLessons,
    getAllLessons,
    getLessonDetail,
    approveLesson,
    rejectLesson,
    publishLesson,
    unpublishLesson,
    getLessonStats
} from '../controllers/adminLessonController.js';
import { auth, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin Lessons
 *   description: Quản lý bài học dành cho Admin (Duyệt bài, Xuất bản, Thống kê)
 */

// Routes cho admin
router.use(auth);
router.use(checkRole(['admin']));

// --- QUẢN LÝ DUYỆT BÀI HỌC ---

/**
 * @swagger
 * /api/admin/lessons/pending:
 *   get:
 *     summary: Lấy danh sách bài học đang chờ duyệt
 *     tags: [Admin Lessons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách các bài học có trạng thái chờ duyệt
 *       403:
 *         description: Không có quyền Admin
 */
router.get('/pending', getPendingLessons);

/**
 * @swagger
 * /api/admin/lessons/all:
 *   get:
 *     summary: Lấy tất cả bài học trong hệ thống
 *     tags: [Admin Lessons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về toàn bộ danh sách bài học (không phân biệt trạng thái)
 */
router.get('/all', getAllLessons);

/**
 * @swagger
 * /api/admin/lessons/{id}:
 *   get:
 *     summary: Lấy chi tiết bài học theo ID (Quyền Admin)
 *     tags: [Admin Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài học
 *     responses:
 *       200:
 *         description: Thông tin chi tiết bài học
 *       404:
 *         description: Không tìm thấy bài học
 */
router.get('/:id', getLessonDetail);

/**
 * @swagger
 * /api/admin/lessons/{id}/approve:
 *   patch:
 *     summary: Phê duyệt bài học
 *     tags: [Admin Lessons]
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
 *         description: Bài học đã được phê duyệt thành công
 */
router.patch('/:id/approve', approveLesson);

/**
 * @swagger
 * /api/admin/lessons/{id}/reject:
 *   patch:
 *     summary: Từ chối bài học
 *     tags: [Admin Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Lý do từ chối
 *     responses:
 *       200:
 *         description: Đã từ chối bài học
 */
router.patch('/:id/reject', rejectLesson);

/**
 * @swagger
 * /api/admin/lessons/{id}/publish:
 *   patch:
 *     summary: Xuất bản bài học (Cho phép học viên nhìn thấy)
 *     tags: [Admin Lessons]
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
 *         description: Bài học đã được xuất bản
 */
router.patch('/:id/publish', publishLesson);

/**
 * @swagger
 * /api/admin/lessons/{id}/unpublish:
 *   patch:
 *     summary: Hủy xuất bản bài học (Ẩn khỏi học viên)
 *     tags: [Admin Lessons]
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
 *         description: Bài học đã được ẩn
 */
router.patch('/:id/unpublish', unpublishLesson);

// --- THỐNG KÊ ---

/**
 * @swagger
 * /api/admin/lessons/stats/overview:
 *   get:
 *     summary: Lấy số liệu thống kê tổng quan về bài học
 *     tags: [Admin Lessons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về số lượng tổng bài học, bài chờ duyệt, bài đã xuất bản...
 */
router.get('/stats/overview', getLessonStats);

export default router;