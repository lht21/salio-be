import express from 'express';
import {
  getSpeakings,
  getSpeakingById,
  createSpeaking,
  updateSpeaking,
  deleteSpeaking,
  submitSpeaking,
  getSubmissions,
  evaluateSubmission,
  uploadSpeakingAudio,
  upload,
  deleteSubmission,
  getSpeakingByLesson,
  createSpeakingForLesson,
  getSubmissionsByLesson
} from '../controllers/speakingController.js';

import { protect, teacher } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/logMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Speaking
 *   description: Quản lý bài tập nói, ghi âm và chấm điểm (Học viên & Giáo viên)
 */

// --- BASIC CRUD ROUTES (Public hoặc Teacher) ---

/**
 * @swagger
 * /api/speakings:
 *   get:
 *     summary: Lấy danh sách tất cả bài tập nói
 *     tags: [Speaking]
 *     responses:
 *       200:
 *         description: Trả về danh sách bài tập nói thành công
 */
router.get('/', getSpeakings);

/**
 * @swagger
 * /api/speakings/{id}:
 *   get:
 *     summary: Lấy chi tiết bài tập nói theo ID
 *     tags: [Speaking]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài tập nói
 *     responses:
 *       200:
 *         description: Thông tin chi tiết bài tập nói
 *       404:
 *         description: Không tìm thấy bài tập
 */
router.get('/:id', getSpeakingById);

/**
 * @swagger
 * /api/speakings:
 *   post:
 *     summary: Tạo bài tập nói mới (Chỉ Giáo viên)
 *     tags: [Speaking]
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
 *               prompt:
 *                 type: string
 *                 description: Yêu cầu hoặc đề bài nói
 *     responses:
 *       201:
 *         description: Tạo bài tập thành công
 */
router.post('/', protect, teacher, logActivity, createSpeaking);

/**
 * @swagger
 * /api/speakings/{id}:
 *   put:
 *     summary: Cập nhật bài tập nói
 *     tags: [Speaking]
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
router.put('/:id', protect, teacher, logActivity, updateSpeaking);

/**
 * @swagger
 * /api/speakings/{id}:
 *   delete:
 *     summary: Xóa bài tập nói
 *     tags: [Speaking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:id', protect, teacher, logActivity, deleteSpeaking);

// --- UPLOAD AUDIO ---

/**
 * @swagger
 * /api/speakings/upload:
 *   post:
 *     summary: Upload file âm thanh bài nói (Ghi âm của học viên)
 *     tags: [Speaking]
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
 *                 description: File âm thanh (mp3, wav, m4a...)
 *     responses:
 *       200:
 *         description: Upload thành công và trả về URL file
 */
router.post('/upload', protect, upload.single('audio'), uploadSpeakingAudio);

// --- LESSON-RELATED ROUTES ---

/**
 * @swagger
 * /api/speakings/lesson/{lessonId}:
 *   get:
 *     summary: Lấy bài tập nói thuộc một bài học cụ thể
 *     tags: [Speaking]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/lesson/:lessonId', getSpeakingByLesson);

/**
 * @swagger
 * /api/speakings/lesson/{lessonId}:
 *   post:
 *     summary: Tạo bài tập nói gắn liền với một bài học (Chỉ Giáo viên)
 *     tags: [Speaking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/lesson/:lessonId', protect, teacher, logActivity, createSpeakingForLesson);

// --- STUDENT SUBMISSION ROUTES ---

/**
 * @swagger
 * /api/speakings/{id}/submit:
 *   post:
 *     summary: Học viên nộp bài làm bài nói
 *     description: Nộp URL file âm thanh đã upload và các thông tin liên quan.
 *     tags: [Speaking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bài tập nói
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               audioUrl:
 *                 type: string
 *               content:
 *                 type: string
 *                 description: Văn bản bài nói (nếu có)
 *     responses:
 *       201:
 *         description: Nộp bài thành công
 */
router.post('/:id/submit', protect, logActivity, submitSpeaking);

// --- TEACHER SUBMISSION MANAGEMENT ---

/**
 * @swagger
 * /api/speakings/submissions/all:
 *   get:
 *     summary: Giáo viên lấy danh sách toàn bộ bài nộp nói cần chấm điểm
 *     tags: [Speaking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách các bài nộp
 */
router.get('/submissions/all', protect, teacher, getSubmissions);

/**
 * @swagger
 * /api/speakings/submissions/lesson/{lessonId}:
 *   get:
 *     summary: Lấy danh sách bài nộp theo bài học
 *     tags: [Speaking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/submissions/lesson/:lessonId', protect, teacher, getSubmissionsByLesson);

/**
 * @swagger
 * /api/speakings/submissions/{id}/evaluate:
 *   put:
 *     summary: Chấm điểm và nhận xét bài nói của học viên
 *     tags: [Speaking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bản ghi bài nộp (Submission ID)
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
 *     responses:
 *       200:
 *         description: Đã chấm điểm thành công
 */
router.put('/submissions/:id/evaluate', protect, teacher, evaluateSubmission);

/**
 * @swagger
 * /api/speakings/submissions/{id}:
 *   delete:
 *     summary: Xóa bài nộp nói
 *     tags: [Speaking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/submissions/:id', protect, teacher, deleteSubmission);

export default router;