import express from 'express';
import {
    createLesson,
    getMyLessons,
    updateLesson,
    deleteLesson,
    addSkillToLesson,
    removeSkillFromLesson
} from '../controllers/teacherController.js';
import { auth, checkRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Teacher
 *   description: Các chức năng dành riêng cho Giáo viên (Quản lý bài giảng và kỹ năng)
 */

// Routes cho giáo viên
router.use(auth);
router.use(checkRole(['teacher', 'admin']));

// --- CRUD BÀI HỌC (TEACHER) ---

/**
 * @swagger
 * /api/teacher/lessons:
 *   post:
 *     summary: Giáo viên tạo bài học mới
 *     tags: [Teacher]
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
 *       403:
 *         description: Không có quyền giáo viên
 */
router.post('/lessons', createLesson);

/**
 * @swagger
 * /api/teacher/lessons:
 *   get:
 *     summary: Lấy danh sách các bài học do giáo viên hiện tại tạo
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách bài học của tôi
 */
router.get('/lessons', getMyLessons);

/**
 * @swagger
 * /api/teacher/lessons/{id}:
 *   put:
 *     summary: Cập nhật thông tin bài học theo ID
 *     tags: [Teacher]
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
router.put('/lessons/:id', updateLesson);

/**
 * @swagger
 * /api/teacher/lessons/{id}:
 *   delete:
 *     summary: Xóa bài học theo ID
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/lessons/:id', deleteLesson);

// --- QUẢN LÝ SKILLS TRONG BÀI HỌC ---

/**
 * @swagger
 * /api/teacher/lessons/{id}/skills:
 *   post:
 *     summary: Thêm kỹ năng (Listening, Reading, v.v.) vào một bài học cụ thể
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài học (Lesson ID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - skillType
 *               - skillId
 *             properties:
 *               skillType:
 *                 type: string
 *                 enum: [vocabulary, grammar, listening, reading, speaking, writing]
 *               skillId:
 *                 type: string
 *                 description: ID của mục kỹ năng cụ thể đã tạo trước đó
 *     responses:
 *       200:
 *         description: Thêm kỹ năng vào bài học thành công
 */
router.post('/lessons/:id/skills', addSkillToLesson);

/**
 * @swagger
 * /api/teacher/lessons/{lessonId}/skills/{skillType}/{skillId}:
 *   delete:
 *     summary: Loại bỏ một kỹ năng khỏi bài học
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: skillType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vocabulary, grammar, listening, reading, speaking, writing]
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã gỡ kỹ năng khỏi bài học thành công
 */
router.delete('/lessons/:lessonId/skills/:skillType/:skillId', removeSkillFromLesson);

export default router;