import express from 'express';
import {
    getPracticeSets,
    getPracticeSetById,
    getPracticeHistory,
    startAttempt
} from '../controllers/practiceController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect); // Toàn bộ route yêu cầu là Student/User đã login

/**
 * @swagger
 * /api/v1/practice/history:
 *   get:
 *     summary: Lấy lịch sử làm bài của user đang đăng nhập
 *     tags: [Practice]
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
 *     responses:
 *       200:
 *         description: Trả về history, total, page, pages từ ExamResult của user
 */
router.get('/history', getPracticeHistory);

/**
 * @swagger
 * /api/v1/practice/{type}/sets:
 *   get:
 *     summary: Lấy danh sách bài luyện tập theo kỹ năng
 *     description: type reading/listening/full lấy Exam đang active; writing lấy Writing; speaking lấy Speaking.
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, full, writing, speaking]
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
 *         description: Trả về data, total, page, pages
 *       400:
 *         description: Type không hợp lệ
 */
router.get('/:type/sets', getPracticeSets);

/**
 * @swagger
 * /api/v1/practice/{type}/sets/{setId}:
 *   get:
 *     summary: Lấy chi tiết bài luyện tập
 *     description: Controller ẩn correctAnswer, explanation, isCorrect với reading/listening/full; ẩn aiConfig với writing; ẩn sampleAnswer và sampleTranslation với speaking.
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, full, writing, speaking]
 *       - in: path
 *         name: setId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về nội dung bài để làm
 *       400:
 *         description: Type không hợp lệ
 *       404:
 *         description: Không tìm thấy bài
 */
router.get('/:type/sets/:setId', getPracticeSetById);

/**
 * @swagger
 * /api/v1/practice/{type}/sets/{setId}/start:
 *   post:
 *     summary: Bắt đầu một lượt làm bài
 *     description: reading/listening/full tạo ExamResult; writing tạo WritingSubmission draft; speaking hiện chưa hỗ trợ tracking.
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, full, writing, speaking]
 *       - in: path
 *         name: setId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về attemptId và type
 *       400:
 *         description: Type chưa hỗ trợ tracking
 */
router.post('/:type/sets/:setId/start', startAttempt);

export default router;