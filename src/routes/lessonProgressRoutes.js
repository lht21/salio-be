import express from 'express';
import { initializeLessonProgress, updateVocabularyStatus, getLessonProgressDetail } from '../controllers/lessonProgressController.js';
import { protect, teacherOrAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Lesson Progress
 *   description: Quản lý và theo dõi tiến độ học tập của học viên (Từ vựng, Bài học)
 */

/**
 * @swagger
 * /api/lesson-progress/initialize/{lessonId}:
 *   post:
 *     summary: Khởi tạo tiến độ cho một bài học mới
 *     description: Tạo bản ghi tiến độ ban đầu cho học viên khi bắt đầu vào bài học.
 *     tags: [Lesson Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài học cần khởi tạo tiến độ
 *     responses:
 *       201:
 *         description: Khởi tạo thành công
 *       400:
 *         description: Bài học này đã được khởi tạo tiến độ trước đó
 *       401:
 *         description: Chưa đăng nhập
 */
//khởi tạo tiến độ học bài
router.post('/initialize/:lessonId', protect, initializeLessonProgress);

/**
 * @swagger
 * /api/lesson-progress/{lessonId}/vocabulary:
 *   patch:
 *     summary: Cập nhật trạng thái học của từ vựng trong bài học
 *     description: Đánh dấu một từ vựng đã học hoặc chưa học trong bài.
 *     tags: [Lesson Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài học
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vocabularyId
 *               - status
 *             properties:
 *               vocabularyId:
 *                 type: string
 *                 description: ID của từ vựng cụ thể
 *               status:
 *                 type: string
 *                 enum: [learned, not_learned]
 *                 description: Trạng thái học tập
 *     responses:
 *       200:
 *         description: Cập nhật tiến độ từ vựng thành công
 */
router.patch('/:lessonId/vocabulary', protect, updateVocabularyStatus);

/**
 * @swagger
 * /api/lesson-progress/{lessonId}:
 *   get:
 *     summary: Lấy chi tiết tiến độ học tập của một bài học
 *     description: Trả về phần trăm hoàn thành và danh sách các hạng mục đã học của bài học cụ thể.
 *     tags: [Lesson Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài học cần xem tiến độ
 *     responses:
 *       200:
 *         description: Thông tin chi tiết tiến độ
 *       404:
 *         description: Không tìm thấy dữ liệu tiến độ cho bài học này
 */
router.get('/:lessonId', protect, getLessonProgressDetail);

export default router;