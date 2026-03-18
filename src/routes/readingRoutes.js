// routes/reading.js
import express from 'express';
import {
  getReadings,
  getReadingById,
  createReading,
  updateReading,
  deleteReading,
  getReadingsByLesson,
  createReadingForLesson,
  getReadingStats,
  getTags,
  bulkCreateReadings,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  submitReadingExercise
} from '../controllers/readingController.js';
import { protect, teacher } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/logMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reading
 *   description: Quản lý bài tập đọc hiểu, câu hỏi và luyện tập
 */

// Tất cả routes đều cần authentication
router.use(protect);

/**
 * @swagger
 * /api/readings:
 *   get:
 *     summary: Lấy danh sách tất cả bài tập đọc hiểu
 *     tags: [Reading]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách bài tập đọc
 */
router.get('/', getReadings);

/**
 * @swagger
 * /api/readings/stats:
 *   get:
 *     summary: Lấy thống kê về bài tập đọc (Số lượng, cấp độ)
 *     tags: [Reading]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu thống kê bài đọc
 */
router.get('/stats', getReadingStats);

/**
 * @swagger
 * /api/readings/tags:
 *   get:
 *     summary: Lấy danh sách các tags được gắn cho bài tập đọc
 *     tags: [Reading]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mảng các thẻ (tags)
 */
router.get('/tags', getTags);

/**
 * @swagger
 * /api/readings/{id}:
 *   get:
 *     summary: Lấy chi tiết bài tập đọc hiểu theo ID
 *     tags: [Reading]
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
 *         description: Nội dung bài đọc và danh sách câu hỏi
 */
router.get('/:id', getReadingById);

// --- LESSON-RELATED ROUTES ---

/**
 * @swagger
 * /api/readings/lesson/{lessonId}:
 *   get:
 *     summary: Lấy danh sách bài đọc thuộc một bài học cụ thể
 *     tags: [Reading]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/lesson/:lessonId', getReadingsByLesson);

/**
 * @swagger
 * /api/readings/lesson/{lessonId}:
 *   post:
 *     summary: Tạo bài tập đọc hiểu mới gắn với một bài học
 *     tags: [Reading]
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
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 */
router.post('/lesson/:lessonId', logActivity, createReadingForLesson);

// --- CẬP NHẬT DỮ LIỆU ---

/**
 * @swagger
 * /api/readings:
 *   post:
 *     summary: Tạo bài tập đọc hiểu mới (Chung)
 *     tags: [Reading]
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
 *               level:
 *                 type: string
 *               content:
 *                 type: string
 */
router.post('/', logActivity, createReading);

/**
 * @swagger
 * /api/readings/bulk-create:
 *   post:
 *     summary: Tạo hàng loạt bài tập đọc hiểu
 *     tags: [Reading]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 */
router.post('/bulk-create', logActivity, bulkCreateReadings);

/**
 * @swagger
 * /api/readings/{id}:
 *   put:
 *     summary: Cập nhật thông tin bài tập đọc hiểu
 *     tags: [Reading]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/:id', logActivity, updateReading);

/**
 * @swagger
 * /api/readings/{id}:
 *   delete:
 *     summary: Xóa bài tập đọc (Chỉ dành cho Giáo viên)
 *     tags: [Reading]
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
 *         description: Xóa thành công
 *       403:
 *         description: Yêu cầu quyền Giáo viên
 */
router.delete('/:id', teacher, logActivity, deleteReading);

// --- QUẢN LÝ CÂU HỎI TRONG BÀI ĐỌC ---

/**
 * @swagger
 * /api/readings/{id}/questions:
 *   post:
 *     summary: Thêm câu hỏi trắc nghiệm mới vào bài đọc
 *     tags: [Reading]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/:id/questions', logActivity, addQuestion);

/**
 * @swagger
 * /api/readings/{id}/questions/{questionId}:
 *   put:
 *     summary: Cập nhật nội dung câu hỏi trắc nghiệm
 *     tags: [Reading]
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
router.put('/:id/questions/:questionId', logActivity, updateQuestion);

/**
 * @swagger
 * /api/readings/{id}/questions/{questionId}:
 *   delete:
 *     summary: Xóa câu hỏi khỏi bài tập đọc
 *     tags: [Reading]
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
router.delete('/:id/questions/:questionId', logActivity, deleteQuestion);

// --- TƯƠNG TÁC VÀ NỘP BÀI ---

/**
 * @swagger
 * /api/readings/{readingId}/submit:
 *   post:
 *     summary: Nộp đáp án bài luyện tập đọc hiểu
 *     tags: [Reading]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: readingId
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
 *       200:
 *         description: Kết quả chấm điểm bài đọc
 */
router.post('/:readingId/submit', protect, submitReadingExercise);

export default router;