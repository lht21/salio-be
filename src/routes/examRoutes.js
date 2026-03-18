import express from 'express'
import {
    getExamsByType,
    getExamById,
    createExam,
    updateExam,
    deleteExam,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    togglePremium,
    submitExamResult
} from '../controllers/examController.js'
import {
    submitExamWriting,
    getExamWritingSubmissions,
    evaluateWritingSubmission,
    deleteExamWritingSubmission,
    getUserWritingAnswers,
    evaluateWritingAnswer
} from '../controllers/submissionExamController.js'
import { protect, teacherOrAdmin } from '../middlewares/authMiddleware.js'

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Exams
 *   description: Quản lý đề thi, câu hỏi và nộp bài (Học viên & Quản trị)
 */

// --- ROUTES CHO STUDENTS (Chỉ cần Login) ---

/**
 * @swagger
 * /api/exams:
 *   get:
 *     summary: Lấy danh sách đề thi theo loại (Dành cho học viên)
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Loại đề thi (ví dụ TOPIK I, TOPIK II)
 *     responses:
 *       200:
 *         description: Trả về danh sách đề thi
 */
router.get('/', protect, getExamsByType)

/**
 * @swagger
 * /api/exams/{id}:
 *   get:
 *     summary: Lấy chi tiết đề thi theo ID
 *     tags: [Exams]
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
 *         description: Chi tiết đề thi và danh sách câu hỏi
 */
router.get('/:id', protect, getExamById)

/**
 * @swagger
 * /api/exams/submit:
 *   post:
 *     summary: Nộp bài làm bài thi trắc nghiệm (Reading/Listening)
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               examId:
 *                 type: string
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Trả về kết quả chấm điểm tự động
 */
router.post('/submit', protect, submitExamResult)

/**
 * @swagger
 * /api/exams/{examId}/writing-submit:
 *   post:
 *     summary: Nộp bài thi tự luận (Writing)
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
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Bài làm đã được ghi nhận và chờ chấm điểm
 */
router.post('/:examId/writing-submit', protect, submitExamWriting)

/**
 * @swagger
 * /api/exams/{examId}/writing-answers/{questionId}:
 *   get:
 *     summary: Lấy danh sách các câu trả lời tự luận của người dùng cho một câu hỏi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:examId/writing-answers/:questionId', protect, getUserWritingAnswers)

// --- ROUTES CHO TEACHER/ADMIN (Quản lý và Chấm điểm) ---

/**
 * @swagger
 * /api/exams/{examId}/writing-submissions:
 *   get:
 *     summary: Lấy tất cả danh sách bài nộp tự luận để chấm điểm (Teacher/Admin)
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:examId/writing-submissions', protect, teacherOrAdmin, getExamWritingSubmissions)

/**
 * @swagger
 * /api/exams/writing-submissions/{examResultId}/{questionId}/evaluate:
 *   put:
 *     summary: Chấm điểm và nhận xét bài viết của học viên
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examResultId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
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
 *               score:
 *                 type: number
 *               feedback:
 *                 type: string
 */
router.put('/writing-submissions/:examResultId/:questionId/evaluate', protect, teacherOrAdmin, evaluateWritingSubmission)

/**
 * @swagger
 * /api/exams/writing-answers/{writingAnswerId}/evaluate:
 *   put:
 *     summary: Chấm điểm bài viết theo Answer ID cụ thể
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: writingAnswerId
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/writing-answers/:writingAnswerId/evaluate', protect, teacherOrAdmin, evaluateWritingAnswer)

/**
 * @swagger
 * /api/exams/{id}:
 *   put:
 *     summary: Cập nhật thông tin đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/:id', protect, teacherOrAdmin, updateExam)

/**
 * @swagger
 * /api/exams/{id}:
 *   delete:
 *     summary: Xóa đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:id', protect, teacherOrAdmin, deleteExam)

/**
 * @swagger
 * /api/exams/{id}/toggle-premium:
 *   patch:
 *     summary: Bật/Tắt trạng thái phí (Premium) của đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/:id/toggle-premium', protect, teacherOrAdmin, togglePremium)

// --- ROUTES QUẢN LÝ CÂU HỎI ---

/**
 * @swagger
 * /api/exams/{id}/questions:
 *   post:
 *     summary: Thêm câu hỏi mới vào đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/:id/questions', protect, teacherOrAdmin, addQuestion)

/**
 * @swagger
 * /api/exams/{id}/questions/{questionId}:
 *   put:
 *     summary: Cập nhật nội dung câu hỏi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/:id/questions/:questionId', protect, teacherOrAdmin, updateQuestion)

/**
 * @swagger
 * /api/exams/{id}/questions/{section}/{questionId}:
 *   delete:
 *     summary: Xóa câu hỏi khỏi một phần cụ thể (Listening/Reading/Writing)
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *         description: "listening, reading, hoặc writing"
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:id/questions/:section/:questionId', protect, teacherOrAdmin, deleteQuestion)

export default router