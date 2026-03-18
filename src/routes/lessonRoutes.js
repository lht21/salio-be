import express from 'express';
import {
    getLessons,
    getLessonById,
    createLesson,
    updateLesson,
    deleteLesson,
    deleteMultipleLessons,
    updateVocabProgress,
    getLessonsForStudent,
    getMyLessons
} from '../controllers/lessonController.js';
import { Lesson } from '../models/index.js';
import { protect, teacherOrAdmin } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/logMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Lessons
 *   description: Quản lý bài học (Bài giảng, Từ vựng, Tiến độ học tập)
 */

// --- ROUTES CHO HỌC VIÊN & PUBLIC ---

/**
 * @swagger
 * /api/lessons/mode/student:
 *   get:
 *     summary: Lấy danh sách bài học dành riêng cho giao diện học viên
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách bài học đã được tối ưu cho học viên
 */
router.get('/mode/student', protect, getLessonsForStudent);

/**
 * @swagger
 * /api/lessons:
 *   get:
 *     summary: Lấy danh sách tất cả bài học (Public)
 *     tags: [Lessons]
 *     responses:
 *       200:
 *         description: Danh sách toàn bộ bài học trong hệ thống
 */
router.get('/', getLessons);

/**
 * @swagger
 * /api/lessons/my:
 *   get:
 *     summary: Lấy danh sách bài học do người dùng hiện tại tạo (Dành cho Teacher)
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bài học của tôi
 */
router.get('/my', protect, getMyLessons);

/**
 * @swagger
 * /api/lessons/{id}:
 *   get:
 *     summary: Lấy chi tiết bài học theo ID
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bài học
 *     responses:
 *       200:
 *         description: Thông tin chi tiết bài học bao gồm từ vựng, ngữ pháp đi kèm
 */
router.get('/:id', getLessonById);

// --- ROUTES QUẢN TRỊ & CẬP NHẬT ---

/**
 * @swagger
 * /api/lessons:
 *   post:
 *     summary: Tạo bài học mới
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               level:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo bài học thành công
 */
router.post('/', protect, logActivity, createLesson);

/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Cập nhật thông tin bài học
 *     tags: [Lessons]
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
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/:id', protect, logActivity, updateLesson);

/**
 * @swagger
 * /api/lessons/{id}:
 *   delete:
 *     summary: Xóa bài học (Soft delete - Chỉ Teacher/Admin)
 *     tags: [Lessons]
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
 *         description: Bài học đã được đưa vào thùng rác
 */
router.delete('/:id', protect, teacherOrAdmin, logActivity, deleteLesson);

/**
 * @swagger
 * /api/lessons/delete-multiple:
 *   post:
 *     summary: Xóa nhiều bài học cùng lúc (Chỉ Teacher/Admin)
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Đã xóa các bài học được chọn
 */
router.post('/delete-multiple', protect, teacherOrAdmin, logActivity, deleteMultipleLessons);

/**
 * @swagger
 * /api/lessons/lesson/{lessonId}/progress:
 *   post:
 *     summary: Cập nhật tiến độ học từ vựng trong bài học
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
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
 *               vocabId:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật tiến độ thành công
 */
router.post('/lesson/:lessonId/progress', protect, updateVocabProgress);

export default router;