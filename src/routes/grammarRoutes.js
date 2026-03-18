import express from 'express';
import {
    getGrammar,
    getGrammarById,
    createGrammar,
    updateGrammar,
    deleteGrammar,
    bulkCreateGrammar,
    getGrammarByLevel,
    getGrammarStats,
    advancedSearch,
    getTags,
    getGrammarByLesson,           
    createGrammarForLesson       
} from '../controllers/grammarController.js';
import { protect, teacher } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/logMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Grammar
 *   description: Quản lý kiến thức ngữ pháp (Học viên & Giáo viên)
 */

// Tất cả routes đều cần authentication
router.use(protect);

/**
 * @swagger
 * /api/grammar:
 *   get:
 *     summary: Lấy danh sách tất cả ngữ pháp
 *     tags: [Grammar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách ngữ pháp
 */
router.get('/', getGrammar);

/**
 * @swagger
 * /api/grammar/stats:
 *   get:
 *     summary: Lấy thống kê về ngữ pháp (số lượng theo level, v.v.)
 *     tags: [Grammar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về dữ liệu thống kê
 */
router.get('/stats', getGrammarStats);

/**
 * @swagger
 * /api/grammar/tags:
 *   get:
 *     summary: Lấy danh sách các tag ngữ pháp đang có
 *     tags: [Grammar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tag
 */
router.get('/tags', getTags);

/**
 * @swagger
 * /api/grammar/search/advanced:
 *   get:
 *     summary: Tìm kiếm ngữ pháp nâng cao
 *     tags: [Grammar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *     responses:
 *       200:
 *         description: Kết quả tìm kiếm
 */
router.get('/search/advanced', advancedSearch);

/**
 * @swagger
 * /api/grammar/{id}:
 *   get:
 *     summary: Lấy chi tiết một cấu trúc ngữ pháp theo ID
 *     tags: [Grammar]
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
 *         description: Chi tiết ngữ pháp
 */
router.get('/:id', getGrammarById);

// --- LESSON-RELATED ROUTES ---

/**
 * @swagger
 * /api/grammar/lesson/{lessonId}:
 *   get:
 *     summary: Lấy danh sách ngữ pháp thuộc một bài học cụ thể
 *     tags: [Grammar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách ngữ pháp trong bài học
 */
router.get('/lesson/:lessonId', getGrammarByLesson);

/**
 * @swagger
 * /api/grammar/lesson/{lessonId}:
 *   post:
 *     summary: Tạo cấu trúc ngữ pháp mới cho một bài học cụ thể
 *     tags: [Grammar]
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
 *               structure:
 *                 type: string
 *               explanation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post('/lesson/:lessonId', logActivity, createGrammarForLesson);

// --- CÁC ROUTE THAY ĐỔI DỮ LIỆU ---

/**
 * @swagger
 * /api/grammar:
 *   post:
 *     summary: Tạo một cấu trúc ngữ pháp mới (Chung)
 *     tags: [Grammar]
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
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post('/', logActivity, createGrammar);

/**
 * @swagger
 * /api/grammar/bulk-create:
 *   post:
 *     summary: Tạo hàng loạt cấu trúc ngữ pháp
 *     tags: [Grammar]
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
 *     responses:
 *       201:
 *         description: Đã tạo hàng loạt thành công
 */
router.post('/bulk-create', logActivity, bulkCreateGrammar);

/**
 * @swagger
 * /api/grammar/{id}:
 *   put:
 *     summary: Cập nhật thông tin ngữ pháp theo ID
 *     tags: [Grammar]
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
router.put('/:id', logActivity, updateGrammar);

/**
 * @swagger
 * /api/grammar/{id}:
 *   delete:
 *     summary: Xóa ngữ pháp (Chỉ dành cho Giáo viên)
 *     tags: [Grammar]
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
 *         description: Quyền giáo viên yêu cầu
 */
router.delete('/:id', teacher, logActivity, deleteGrammar);

// --- LEVEL-SPECIFIC GRAMMAR ---

/**
 * @swagger
 * /api/grammar/levels/{level}:
 *   get:
 *     summary: Lấy danh sách ngữ pháp theo cấp độ (Level)
 *     tags: [Grammar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: string
 *         description: "Ví dụ: Sơ cấp, Trung cấp, N1, N2..."
 *     responses:
 *       200:
 *         description: Danh sách ngữ pháp theo level
 */
router.get('/levels/:level', getGrammarByLevel);

export default router;