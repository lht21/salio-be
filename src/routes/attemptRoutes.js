import express from 'express';
import {
    getAttemptStatus,
    saveAnswer,
    submitAttempt,
    getAttemptResult,
    reviewAttempt
} from '../controllers/practiceController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect); 
/**
 * @swagger
 * /api/v1/attempts/{attemptId}:
 *   get:
 *     summary: Lấy trạng thái lượt làm bài
 *     description: Tìm trong ExamResult trước, nếu không có thì tìm trong WritingSubmission. User chỉ xem được attempt của mình; admin/teacher được xem tất cả.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về ExamResult hoặc WritingSubmission
 *       400:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy lượt làm bài
 */
router.get('/:attemptId', getAttemptStatus);

/**
 * @swagger
 * /api/v1/attempts/{attemptId}/save-answer:
 *   post:
 *     summary: Lưu đáp án tạm thời
 *     description: ExamResult lưu vào readingAnswers/listeningAnswers theo type; WritingSubmission ghi req.body.answer vào trường content.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
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
 *               type:
 *                 type: string
 *                 enum: [reading, listening, writing]
 *                 example: reading
 *               questionId:
 *                 type: string
 *               answer:
 *                 oneOf:
 *                   - type: string
 *                   - type: boolean
 *                   - type: array
 *                     items:
 *                       type: string
 *               timeSpent:
 *                 type: number
 *                 example: 300
 *     responses:
 *       200:
 *         description: Lưu đáp án thành công
 *       404:
 *         description: Không tìm thấy lượt làm bài
 */
router.post('/:attemptId/save-answer', saveAnswer);

/**
 * @swagger
 * /api/v1/attempts/{attemptId}/submit:
 *   post:
 *     summary: Nộp bài
 *     description: ExamResult được chấm reading/listening tự động; WritingSubmission đổi status sang pending_ai.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nộp bài thành công
 *       400:
 *         description: Attempt đã được nộp trước đó
 *       404:
 *         description: Không tìm thấy lượt làm bài
 */
router.post('/:attemptId/submit', submitAttempt);

/**
 * @swagger
 * /api/v1/attempts/{attemptId}/result:
 *   get:
 *     summary: Lấy kết quả tổng quan
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về ExamResult hoặc WritingSubmission
 *       400:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy lượt làm bài
 */
router.get('/:attemptId/result', getAttemptResult);

/**
 * @swagger
 * /api/v1/attempts/{attemptId}/review:
 *   get:
 *     summary: Lấy chi tiết review bài làm
 *     description: ExamResult populate exam và sections listening/reading; WritingSubmission populate writing.
 *     tags: [Attempts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về dữ liệu review chi tiết
 *       400:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy lượt làm bài
 */
router.get('/:attemptId/review', reviewAttempt);

export default router;