import express from 'express';
import {
    getGrammars,
    createGrammar,
    getGrammarById,
    updateGrammar,
    deleteGrammar,
    publishGrammar,
    importGrammars,
    getSimilarGrammars,
    getGrammarDetail,
    getGrammarExercise,
    submitGrammarExercise,
    getGrammarResult
} from '../controllers/grammarController.js';
import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/v1/grammars:
 *   get:
 *     summary: Lấy danh sách ngữ pháp
 *     description: Hỗ trợ search, filter theo level, tags, isActive. Student chỉ thấy nội dung đã publish.
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [Sơ cấp 1, Sơ cấp 2, Trung cấp 3, Trung cấp 4, Cao cấp 5, Cao cấp 6]
 *       - in: query
 *         name: tags
 *         description: Nhiều tag cách nhau bằng dấu phẩy
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Trả về grammars, total, page, pages
 */
router.get('/', getGrammars);

/**
 * @swagger
 * /api/v1/grammars:
 *   post:
 *     summary: Admin tạo một mục ngữ pháp mới
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [structure, meaning, explanation]
 *             properties:
 *               structure:
 *                 type: string
 *                 example: N입니다
 *               meaning:
 *                 type: string
 *                 example: Là N
 *               explanation:
 *                 type: string
 *               usage:
 *                 type: string
 *               exampleSentences:
 *                 type: array
 *                 items:
 *                   type: object
 *               exercises:
 *                 type: array
 *                 items:
 *                   type: object
 *               similarGrammar:
 *                 type: array
 *                 items:
 *                   type: string
 *               level:
 *                 type: string
 *                 enum: [Sơ cấp 1, Sơ cấp 2, Trung cấp 3, Trung cấp 4, Cao cấp 5, Cao cấp 6]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             structure: N입니다
 *             meaning: Là N
 *             explanation: Dùng để giới thiệu hoặc định nghĩa danh từ một cách trang trọng.
 *             usage: Gắn sau danh từ.
 *             level: Sơ cấp 1
 *             tags: [bài 1, giới thiệu]
 *             exampleSentences:
 *               - korean: 저는 학생입니다.
 *                 vietnamese: Tôi là học sinh.
 *             exercises:
 *               - clientId: 1
 *                 type: whiteboard
 *                 instruction: Điền từ còn thiếu vào chỗ trống
 *                 correctAnswerStr: 입니다
 *                 sentenceLeft: 저는 학생
 *                 sentenceRight: .
 *                 vietnameseMeaning: (Tôi là học sinh.)
 *                 maxLength: 10
 *                 placeholder: ___
 *               - clientId: 3
 *                 type: word_match
 *                 instruction: Sắp xếp các từ sau thành câu hoàn chỉnh
 *                 vietnamesePrompt: Sách là cái này.
 *                 words: [입니다., 이것은, 책]
 *                 correctOrder: [이것은, 책, 입니다.]
 *     responses:
 *       201:
 *         description: Tạo ngữ pháp thành công
 */
router.post('/', admin, createGrammar);

/**
 * @swagger
 * /api/v1/grammars/import:
 *   post:
 *     summary: Admin import hàng loạt ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: array
 *                 items:
 *                   type: object
 *               - type: object
 *                 properties:
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *     responses:
 *       201:
 *         description: Import thành công
 */
router.post('/import', admin, importGrammars);

/**
 * @swagger
 * /api/v1/grammars/{grammarId}:
 *   get:
 *     summary: Xem chi tiết một ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grammarId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về chi tiết ngữ pháp
 *       404:
 *         description: Không tìm thấy ngữ pháp
 */
router.get('/:grammarId', getGrammarById);

/**
 * @swagger
 * /api/v1/grammars/{grammarId}:
 *   patch:
 *     summary: Admin cập nhật ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grammarId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/:grammarId', admin, updateGrammar);

/**
 * @swagger
 * /api/v1/grammars/{grammarId}:
 *   delete:
 *     summary: Admin xóa ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grammarId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete('/:grammarId', admin, deleteGrammar);

/**
 * @swagger
 * /api/v1/grammars/{grammarId}/publish:
 *   patch:
 *     summary: Admin publish hoặc ẩn ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grammarId
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
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái publish thành công
 */
router.patch('/:grammarId/publish', admin, publishGrammar);

/**
 * @swagger
 * /api/v1/grammars/{grammarId}/similar:
 *   get:
 *     summary: Lấy danh sách ngữ pháp tương tự
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grammarId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về danh sách ngữ pháp liên quan
 */
router.get('/:grammarId/similar', getSimilarGrammars);

/**
 * @swagger
 * /api/v1/grammars/{grammarId}/detail:
 *   get:
 *     summary: Student lấy nội dung học chi tiết của ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grammarId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về nội dung học, không gồm exercises
 */
router.get('/:grammarId/detail', getGrammarDetail);

/**
 * @swagger
 * /api/v1/grammars/{grammarId}/exercise:
 *   get:
 *     summary: Student lấy bài tập luyện ngữ pháp
 *     description: Không trả correctAnswerStr hoặc correctOrder.
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grammarId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về questions theo shape FE cần
 */
router.get('/:grammarId/exercise', getGrammarExercise);

/**
 * @swagger
 * /api/v1/grammars/{grammarId}/exercise/submit:
 *   post:
 *     summary: Student nộp bài tập ngữ pháp để chấm điểm
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grammarId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       oneOf:
 *                         - type: string
 *                         - type: number
 *                     answer:
 *                       oneOf:
 *                         - type: string
 *                         - type: array
 *                           items:
 *                             type: string
 *           example:
 *             answers:
 *               - questionId: 1
 *                 answer: 입니다
 *               - questionId: 3
 *                 answer: [이것은, 책, 입니다.]
 *     responses:
 *       200:
 *         description: Trả về điểm và kết quả từng câu
 */
router.post('/:grammarId/exercise/submit', submitGrammarExercise);

/**
 * @swagger
 * /api/v1/grammars/{grammarId}/result:
 *   get:
 *     summary: Student xem kết quả làm bài ngữ pháp gần nhất
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grammarId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về result gần nhất
 */
router.get('/:grammarId/result', getGrammarResult);

export default router;