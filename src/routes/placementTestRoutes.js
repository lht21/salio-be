import express from 'express';
import {
    getPlacementTestConfig,
    assemblePlacementTest,
    reorderPlacementQuestions,
    removePlacementItems,
    startPlacementTest,
    getPlacementSession,
    savePlacementAnswer,
    submitPlacementSession,
    getPlacementResult,
    getSkippedLessons,
    getPlacementSessions,
    getPlacementSessionById
} from '../controllers/placementTestController.js';
import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/placement-test/start:
 *   post:
 *     summary: Student bắt đầu Placement Test
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Trả về sessionId
 *       400:
 *         description: Placement Test chưa được lắp ráp câu hỏi
 *       404:
 *         description: Chưa có Placement Test đang hoạt động
 */
router.post('/placement-test/start', protect, startPlacementTest);

/**
 * @swagger
 * /api/v1/placement-test/session/{sessionId}:
 *   get:
 *     summary: Student lấy phiên Placement Test đang làm
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về session và quiz đã ẩn đáp án
 *       404:
 *         description: Không tìm thấy phiên
 */
router.get('/placement-test/session/:sessionId', protect, getPlacementSession);

/**
 * @swagger
 * /api/v1/placement-test/session/{sessionId}/save-answer:
 *   post:
 *     summary: Student lưu đáp án tạm thời
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sectionType, questionId, answer]
 *             properties:
 *               sectionType:
 *                 type: string
 *                 description: Dùng quiz nếu câu hỏi nằm trực tiếp trong Quiz.questions; Placement Test từ question bank chỉ dùng listening/reading.
 *                 enum: [quiz, listening, reading]
 *                 example: reading
 *               itemId:
 *                 type: string
 *                 description: ID item trong question bank. Bắt buộc nếu sectionType khác quiz.
 *                 example: 69eca1d3dab38692c57c6840
 *               questionId:
 *                 type: string
 *                 description: ID câu hỏi con bên trong item.questions
 *                 example: 69eca1d3dab38692c57c6841
 *               answer:
 *                 oneOf:
 *                   - type: string
 *                   - type: boolean
 *                   - type: array
 *                     items:
 *                       type: string
 *                 example: 먹고 나서
 *               timeSpent:
 *                 type: number
 *                 description: Tổng thời gian đã làm tính bằng giây
 *                 example: 120
 *           examples:
 *             reading:
 *               summary: Lưu đáp án câu reading
 *               value:
 *                 sectionType: reading
 *                 itemId: 69eca1d3dab38692c57c6840
 *                 questionId: 69eca1d3dab38692c57c6841
 *                 answer: 먹고 나서
 *                 timeSpent: 120
 *             listening:
 *               summary: Lưu đáp án câu listening
 *               value:
 *                 sectionType: listening
 *                 itemId: 69ec82ddfdc1f68f291c19f1
 *                 questionId: 69ec82ddfdc1f68f291c19f2
 *                 answer: 설탕을 가져온다
 *                 timeSpent: 180
 *             inlineQuiz:
 *               summary: Lưu đáp án câu hỏi nằm trực tiếp trong Quiz.questions
 *               value:
 *                 sectionType: quiz
 *                 questionId: 69eca1d3dab38692c57c6841
 *                 answer: 먹고 나서
 *                 timeSpent: 120
 *     responses:
 *       200:
 *         description: Lưu đáp án thành công
 *       404:
 *         description: Không tìm thấy phiên đang làm
 */
router.post('/placement-test/session/:sessionId/save-answer', protect, savePlacementAnswer);

/**
 * @swagger
 * /api/v1/placement-test/session/{sessionId}/submit:
 *   post:
 *     summary: Student nộp Placement Test
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeSpent:
 *                 type: number
 *                 description: Tổng thời gian làm bài tính bằng giây
 *                 example: 300
 *     responses:
 *       200:
 *         description: Trả về điểm, recommendedLevel và skippedLessons
 *       400:
 *         description: Phiên đã được nộp
 */
router.post('/placement-test/session/:sessionId/submit', protect, submitPlacementSession);

/**
 * @swagger
 * /api/v1/placement-test/session/{sessionId}/result:
 *   get:
 *     summary: Student xem kết quả Placement Test
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về kết quả tổng quan
 *       400:
 *         description: Placement Test chưa được nộp
 */
router.get('/placement-test/session/:sessionId/result', protect, getPlacementResult);

/**
 * @swagger
 * /api/v1/placement-test/session/{sessionId}/skipped-lessons:
 *   get:
 *     summary: Student xem danh sách lesson được phép bỏ qua
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về recommendedLevel và skippedLessons
 */
router.get('/placement-test/session/:sessionId/skipped-lessons', protect, getSkippedLessons);

/**
 * @swagger
 * /api/v1/admin/placement-test:
 *   get:
 *     summary: Admin lấy cấu hình Placement Test hiện tại
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về cấu hình Placement Test
 */
router.get('/admin/placement-test', protect, admin, getPlacementTestConfig);

/**
 * @swagger
 * /api/v1/admin/placement-test/assemble:
 *   patch:
 *     summary: Admin lắp ráp nhiều item từ question bank vào từng section Placement Test
 *     description: Placement Test chỉ dùng listening và reading. Mỗi section đều chứa được nhiều item. Mặc định append sẽ thêm item mới, mode replace sẽ ghi đè toàn bộ section.
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
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
 *                 enum: [listening, reading]
 *                 example: reading
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [69ec82ddfdc1f68f291c19f1, 69ec82ddfdc1f68f291c19f2]
 *               mode:
 *                 type: string
 *                 enum: [append, replace]
 *                 default: append
 *                 description: append để thêm item mới vào section, replace để ghi đè toàn bộ section
 *     responses:
 *       200:
 *         description: Lắp ráp thành công
 */
router.patch('/admin/placement-test/assemble', protect, admin, assemblePlacementTest);

/**
 * @swagger
 * /api/v1/admin/placement-test/questions/reorder:
 *   patch:
 *     summary: Admin sắp xếp lại thứ tự item trong section
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
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
 *                 enum: [listening, reading]
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Sắp xếp thành công
 */
router.patch('/admin/placement-test/questions/reorder', protect, admin, reorderPlacementQuestions);

/**
 * @swagger
 * /api/v1/admin/placement-test/questions/remove:
 *   patch:
 *     summary: Admin xóa item khỏi section Placement Test
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
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
 *                 enum: [listening, reading]
 *                 example: reading
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [69ec9379905f1e609e1d6efd]
 *     responses:
 *       200:
 *         description: Xóa item thành công
 */
router.patch('/admin/placement-test/questions/remove', protect, admin, removePlacementItems);

/**
 * @swagger
 * /api/v1/placement-test/sessions:
 *   get:
 *     summary: Admin lấy danh sách phiên Placement Test
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về sessions, total, page, pages
 */
router.get('/placement-test/sessions', protect, admin, getPlacementSessions);

/**
 * @swagger
 * /api/v1/placement-test/sessions/{sessionId}:
 *   get:
 *     summary: Admin lấy chi tiết phiên Placement Test
 *     tags: [Placement Test]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về chi tiết phiên
 *       404:
 *         description: Không tìm thấy phiên
 */
router.get('/placement-test/sessions/:sessionId', protect, admin, getPlacementSessionById);

export default router;
