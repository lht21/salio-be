import express from 'express';
import {
    getAllExams,
    createExam,
    getExamById,
    updateExam,
    deleteExam,
    togglePublishExam,
    assembleExam
} from '../controllers/examController.js';

import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);
router.use(admin);

/**
 * @swagger
 * /api/v1/exams:
 *   get:
 *     summary: Lấy danh sách đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: examType
 *         schema:
 *           type: string
 *           enum: [topik1, topik2, eps]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Trả về exams, total, page, pages
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải admin
 */
router.get('/', getAllExams);

/**
 * @swagger
 * /api/v1/exams:
 *   post:
 *     summary: Tạo đề thi mới
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, examType]
 *             properties:
 *               title:
 *                 type: string
 *                 example: TOPIK I Mock Test 01
 *               examType:
 *                 type: string
 *                 enum: [topik1, topik2, eps]
 *               duration:
 *                 type: object
 *               totalScore:
 *                 type: number
 *               isPremium:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Tạo đề thi thành công
 *       400:
 *         description: Thiếu title hoặc examType
 */
router.post('/', createExam);

/**
 * @swagger
 * /api/v1/exams/{examId}:
 *   get:
 *     summary: Lấy chi tiết đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về đề thi đã populate sections và createdBy
 *       404:
 *         description: Không tìm thấy đề thi
 */
router.get('/:examId', getExamById);

/**
 * @swagger
 * /api/v1/exams/{examId}:
 *   patch:
 *     summary: Cập nhật thông tin đề thi
 *     description: Controller bỏ qua trường sections trong payload; dùng endpoint assemble để lắp ráp câu hỏi.
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
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
 *               title:
 *                 type: string
 *               examType:
 *                 type: string
 *                 enum: [topik1, topik2, eps]
 *               duration:
 *                 type: object
 *               totalScore:
 *                 type: number
 *               isPremium:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy đề thi
 */
router.patch('/:examId', updateExam);

/**
 * @swagger
 * /api/v1/exams/{examId}:
 *   delete:
 *     summary: Xóa đề thi
 *     description: Chỉ xóa document Exam, không xóa item trong question bank.
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa đề thi thành công
 *       404:
 *         description: Không tìm thấy đề thi
 */
router.delete('/:examId', deleteExam);

/**
 * @swagger
 * /api/v1/exams/{examId}/publish:
 *   patch:
 *     summary: Bật/tắt trạng thái publish của đề thi
 *     description: Khi publish, controller yêu cầu đề thi phải có ít nhất một item trong sections.
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đổi trạng thái thành công
 *       400:
 *         description: Đề thi rỗng nên không thể publish
 *       404:
 *         description: Không tìm thấy đề thi
 */
router.patch('/:examId/publish', togglePublishExam);

/**
 * @swagger
 * /api/v1/exams/{examId}/assemble:
 *   patch:
 *     summary: Lắp ráp item vào section của đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sectionType, itemIds]
 *             properties:
 *               sectionType:
 *                 type: string
 *                 enum: [listening, reading, writing]
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Lắp ráp thành công và trả về exam đã populate section vừa cập nhật
 *       400:
 *         description: sectionType hoặc itemIds không hợp lệ
 *       404:
 *         description: Không tìm thấy đề thi
 */
router.patch('/:examId/assemble', assembleExam);

export default router;