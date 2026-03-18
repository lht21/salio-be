// routes/listening.js
import express from 'express';
import {
  getListenings,
  getListeningById,
  createListening,
  updateListening,
  deleteListening,
  uploadListening,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getListeningsByLesson,
  createListeningForLesson,
  submitListening,
  getListeningProgress,
  getListeningStats,
  getTags,
  bulkCreateListenings,
  upload
} from '../controllers/listeningController.js';
import { protect, teacher } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/logMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Listening
 *   description: Quản lý bài tập nghe, câu hỏi và tiến độ luyện nghe
 */

// Tất cả routes đều cần authentication
router.use(protect);

/**
 * @swagger
 * /api/listening:
 *   get:
 *     summary: Lấy danh sách tất cả bài tập nghe
 *     tags: [Listening]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách bài tập nghe
 */
router.get('/', getListenings);

/**
 * @swagger
 * /api/listening/stats:
 *   get:
 *     summary: Lấy thống kê về bài tập nghe
 *     tags: [Listening]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu thống kê bài nghe
 */
router.get('/stats', getListeningStats);

/**
 * @swagger
 * /api/listening/tags:
 *   get:
 *     summary: Lấy danh sách tags của các bài nghe
 *     tags: [Listening]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tags
 */
router.get('/tags', getTags);

/**
 * @swagger
 * /api/listening/{id}:
 *   get:
 *     summary: Lấy chi tiết bài tập nghe theo ID
 *     tags: [Listening]
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
 *         description: Thông tin chi tiết bài nghe và câu hỏi
 */
router.get('/:id', getListeningById);

// --- LESSON-RELATED ROUTES ---

/**
 * @swagger
 * /api/listening/lesson/{lessonId}:
 *   get:
 *     summary: Lấy danh sách bài nghe thuộc một bài học cụ thể
 *     tags: [Listening]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/lesson/:lessonId', getListeningsByLesson);

/**
 * @swagger
 * /api/listening/lesson/{lessonId}:
 *   post:
 *     summary: Tạo bài tập nghe mới gắn với bài học
 *     tags: [Listening]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/lesson/:lessonId', logActivity, createListeningForLesson);

// --- CẬP NHẬT DỮ LIỆU ---

/**
 * @swagger
 * /api/listening:
 *   post:
 *     summary: Tạo bài tập nghe mới (Chung)
 *     tags: [Listening]
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
 */
router.post('/', logActivity, createListening);

/**
 * @swagger
 * /api/listening/upload:
 *   post:
 *     summary: Upload file âm thanh cho bài nghe
 *     tags: [Listening]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload thành công và trả về đường dẫn file
 */
router.post('/upload', upload.single('audio'), logActivity, uploadListening);

/**
 * @swagger
 * /api/listening/bulk-create:
 *   post:
 *     summary: Tạo hàng loạt bài tập nghe
 *     tags: [Listening]
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
router.post('/bulk-create', logActivity, bulkCreateListenings);

/**
 * @swagger
 * /api/listening/{id}:
 *   put:
 *     summary: Cập nhật thông tin bài nghe
 *     tags: [Listening]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/:id', logActivity, updateListening);

/**
 * @swagger
 * /api/listening/{id}:
 *   delete:
 *     summary: Xóa bài nghe (Chỉ Giáo viên)
 *     tags: [Listening]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:id', teacher, logActivity, deleteListening);

// --- QUẢN LÝ CÂU HỎI TRONG BÀI NGHE ---

/**
 * @swagger
 * /api/listening/{id}/questions:
 *   post:
 *     summary: Thêm câu hỏi mới vào bài nghe
 *     tags: [Listening]
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
 * /api/listening/{id}/questions/{questionId}:
 *   put:
 *     summary: Cập nhật nội dung câu hỏi
 *     tags: [Listening]
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
 * /api/listening/{id}/questions/{questionId}:
 *   delete:
 *     summary: Xóa câu hỏi khỏi bài nghe
 *     tags: [Listening]
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

// --- TƯƠNG TÁC VÀ TIẾN ĐỘ ---

/**
 * @swagger
 * /api/listening/{listeningId}/submit:
 *   post:
 *     summary: Nộp bài làm của phần nghe
 *     tags: [Listening]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listeningId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/:listeningId/submit', protect, submitListening);

/**
 * @swagger
 * /api/listening/progress/{id}:
 *   get:
 *     summary: Xem tiến độ luyện nghe của người dùng cho bài cụ thể
 *     tags: [Listening]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/progress/:id', getListeningProgress);

export default router;