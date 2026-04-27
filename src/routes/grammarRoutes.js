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
    checkGrammarExercise,
    getGrammarQuizzes,
    createGrammarQuiz,
    getGrammarQuizById,
    updateGrammarQuiz,
    addGrammarQuizItems,
    removeGrammarQuizItems,
    reorderGrammarQuizItems,
    deleteGrammarQuiz,
    togglePublishGrammarQuiz,
    startGrammarQuiz,
    getGrammarQuizSession,
    saveGrammarQuizAnswer,
    submitGrammarQuiz,
    getGrammarQuizResult
} from '../controllers/grammarController.js';
import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/v1/grammars/quizzes:
 *   get:
 *     summary: Admin lấy danh sách quiz ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về quizzes, total, page, pages
 */
router.get('/quizzes', admin, getGrammarQuizzes);

/**
 * @swagger
 * /api/v1/grammars/quizzes:
 *   post:
 *     summary: Admin tạo quiz ngữ pháp từ item trong question bank
 *     description: Tạo mới quiz và lấy itemIds từ /api/v1/bank/grammar.
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, itemIds]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Quiz ngữ pháp bài 1
 *               grammar:
 *                 type: string
 *               level:
 *                 type: string
 *               category:
 *                 type: string
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *                 example: true
 *           example:
 *             title: Quiz ngữ pháp bài 1
 *             grammar: 69ef1ad4f2a6ec2f593f2eba
 *             itemIds: [69ef1ad4f2a6ec2f593f2ebb]
 *             isActive: true
 *     responses:
 *       201:
 *         description: Tạo quiz thành công
 */
router.post('/quizzes', admin, createGrammarQuiz);

/**
 * @swagger
 * /api/v1/grammars/quizzes/{quizId}:
 *   get:
 *     summary: Admin lấy chi tiết quiz ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về quiz
 */
router.get('/quizzes/:quizId', admin, getGrammarQuizById);

/**
 * @swagger
 * /api/v1/grammars/quizzes/{quizId}:
 *   patch:
 *     summary: Admin cập nhật quiz ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
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
router.patch('/quizzes/:quizId', admin, updateGrammarQuiz);

/**
 * @swagger
 * /api/v1/grammars/quizzes/{quizId}/items:
 *   patch:
 *     summary: Admin thêm question grammar từ bank vào quiz
 *     description: itemIds lấy từ /api/v1/bank/grammar.
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemIds]
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             itemIds:
 *               - 69ef1ad4f2a6ec2f593f2ebb
 *     responses:
 *       200:
 *         description: Thêm item vào quiz thành công
 */
router.patch('/quizzes/:quizId/items', admin, addGrammarQuizItems);

/**
 * @swagger
 * /api/v1/grammars/quizzes/{quizId}/items:
 *   delete:
 *     summary: Admin xóa question grammar khỏi quiz
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemIds]
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Xóa item khỏi quiz thành công
 */
router.delete('/quizzes/:quizId/items', admin, removeGrammarQuizItems);

/**
 * @swagger
 * /api/v1/grammars/quizzes/{quizId}/items/reorder:
 *   patch:
 *     summary: Admin sắp xếp thứ tự question grammar trong quiz
 *     description: itemIds phải chứa toàn bộ item hiện có trong quiz theo thứ tự mới.
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemIds]
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Sắp xếp thành công
 */
router.patch('/quizzes/:quizId/items/reorder', admin, reorderGrammarQuizItems);

/**
 * @swagger
 * /api/v1/grammars/quizzes/{quizId}/publish:
 *   patch:
 *     summary: Admin publish hoặc ẩn quiz ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đổi trạng thái thành công
 */
router.patch('/quizzes/:quizId/publish', admin, togglePublishGrammarQuiz);

/**
 * @swagger
 * /api/v1/grammars/quizzes/{quizId}:
 *   delete:
 *     summary: Admin xóa quiz ngữ pháp
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete('/quizzes/:quizId', admin, deleteGrammarQuiz);

/**
 * @swagger
 * /api/v1/grammars/quiz/start:
 *   post:
 *     summary: Student bắt đầu quiz ngữ pháp
 *     description: Lấy câu hỏi từ GrammarQuiz đã publish, đáp án lấy từ /api/v1/bank/grammar.
 *     tags: [Grammars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quizId:
 *                 type: string
 *               grammarId:
 *                 type: string
 *               limit:
 *                 type: number
 *                 example: 20
 *     responses:
 *       201:
 *         description: Trả về sessionId
 */
router.post('/quiz/start', startGrammarQuiz);

/**
 * @swagger
 * /api/v1/grammars/quiz/session/{sessionId}:
 *   get:
 *     summary: Student lấy phiên quiz ngữ pháp đang làm
 *     tags: [Grammars]
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
 *         description: Trả về phiên quiz đã ẩn đáp án
 */
router.get('/quiz/session/:sessionId', getGrammarQuizSession);

/**
 * @swagger
 * /api/v1/grammars/quiz/session/{sessionId}/save-answer:
 *   post:
 *     summary: Student lưu đáp án quiz ngữ pháp
 *     tags: [Grammars]
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
 *             required: [questionId, answer]
 *             properties:
 *               questionId:
 *                 type: string
 *               answer: {}
 *     responses:
 *       200:
 *         description: Lưu đáp án thành công
 */
router.post('/quiz/session/:sessionId/save-answer', saveGrammarQuizAnswer);

/**
 * @swagger
 * /api/v1/grammars/quiz/session/{sessionId}/submit:
 *   post:
 *     summary: Student nộp quiz ngữ pháp
 *     tags: [Grammars]
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
 *         description: Trả về kết quả quiz
 */
router.post('/quiz/session/:sessionId/submit', submitGrammarQuiz);

/**
 * @swagger
 * /api/v1/grammars/quiz/session/{sessionId}/result:
 *   get:
 *     summary: Student xem kết quả quiz ngữ pháp
 *     tags: [Grammars]
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
 *         description: Trả về kết quả quiz
 */
router.get('/quiz/session/:sessionId/result', getGrammarQuizResult);

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
 *               exercises:
 *                 type: array
 *                 items:
 *                   type: object
 *               level:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             structure: N입니다
 *             meaning: Là N
 *             explanation: Dùng để giới thiệu hoặc định nghĩa danh từ.
 *             usage: Gắn sau danh từ.
 *             level: Sơ cấp 1
 *             tags: [bài 1, giới thiệu]
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
 *     summary: Student lấy bài tập luyện của một ngữ pháp
 *     description: Trả về Grammar.exercises theo shape FE, không trả correctAnswerStr/correctOrder/explanation.
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
 *         description: Trả về danh sách câu exercise whiteboard/word_match đã ẩn đáp án
 */
router.get('/:grammarId/exercise', getGrammarExercise);

/**
 * @swagger
 * /api/v1/grammars/{grammarId}/exercise/check:
 *   post:
 *     summary: Student check đúng/sai một câu exercise
 *     description: Không lưu kết quả. FE chỉ cho qua câu tiếp theo khi isCorrect = true.
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
 *             required: [questionId, answer]
 *             properties:
 *               questionId:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *               answer:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *           examples:
 *             whiteboard:
 *               summary: Check câu điền từ
 *               value:
 *                 questionId: 1
 *                 answer: 입니다
 *             wordMatch:
 *               summary: Check câu sắp xếp từ
 *               value:
 *                 questionId: 3
 *                 answer: [이것은, 책, 입니다.]
 *     responses:
 *       200:
 *         description: Trả về isCorrect, correctAnswer và explanation
 */
router.post('/:grammarId/exercise/check', checkGrammarExercise);

export default router;