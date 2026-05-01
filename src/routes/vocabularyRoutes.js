import express from 'express';
import {
    getVocabularies,
    createVocabulary,
    getVocabularyById,
    updateVocabulary,
    deleteVocabulary,
    updateBulkImages,
    togglePublishVocabulary,
    importVocabularies,
    getVocabularyStudyQueue,
    getVocabularyLearningProgress,
    markVocabularyLearningStatus,
    startVocabularyQuiz,
    getVocabularyQuizSession,
    saveVocabularyQuizAnswer,
    submitVocabularyQuiz,
    getVocabularyQuizResult,
    getVocabularyQuizResults,
    getVocabularyQuizzes,
    createVocabularyQuiz,
    getVocabularyQuizById,
    updateVocabularyQuiz,
    addVocabularyQuizItems,
    removeVocabularyQuizItems,
    reorderVocabularyQuizItems,
    deleteVocabularyQuiz,
    togglePublishVocabularyQuiz
} from '../controllers/vocabularyController.js';

import { protect, admin } from '../middlewares/auth.js';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Bắt buộc đăng nhập cho toàn bộ các API thuộc module này
router.use(protect);

// Các API dành cho Học viên (Student) & Admin xem chung
/**
 * @swagger
 * /api/v1/vocabularies/study-queue:
 *   get:
 *     summary: Lấy danh sách từ vựng để học/ôn lại
 *     description: Trả về từ active kèm learningStatus của user. Có thể lọc theo level, category, status remembered/forgotten/learning.
 *     tags: [Vocabularies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lessonId
 *         description: Nếu truyền lessonId, API lọc từ vựng của lesson và cập nhật tiến độ vocabulary trong LessonProgress.
 *         schema:
 *           type: string
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [learning, remembered, forgotten]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Trả về danh sách từ cần học
 */
router.get('/study-queue', getVocabularyStudyQueue);

/**
 * @swagger
 * /api/v1/vocabularies/learning-progress:
 *   get:
 *     summary: Xem tiến độ học từ vựng của user
 *     tags: [Vocabularies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [learning, remembered, forgotten]
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
 *         description: Trả về progress, total, page, pages
 */
router.get('/learning-progress', getVocabularyLearningProgress);

/**
 * @swagger
 * /api/v1/vocabularies/quizzes:
 *   get:
 *     summary: Admin lấy danh sách quiz từ vựng
 *     tags: [Vocabularies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Trả về quizzes, total, page, pages
 */
router.get('/quizzes', admin, getVocabularyQuizzes);

/**
 * @swagger
 * /api/v1/vocabularies/quizzes:
 *   post:
 *     summary: Admin tạo quiz từ vựng
 *     description: Quiz từ vựng là vựng quiz riêng, lấy các item từ /api/v1/bank/vocabulary.
 *     tags: [Vocabularies]
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
 *                 example: Quiz từ vựng bài 1
 *               description:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [Sơ cấp 1, Sơ cấp 2, Trung cấp 3, Trung cấp 4, Cao cấp 5, Cao cấp 6]
 *               category:
 *                 type: string
 *                 example: nghề nghiệp
 *               timeLimit:
 *                 type: number
 *                 example: 300
 *               passingScore:
 *                 type: number
 *                 example: 80
 *               isActive:
 *                 type: boolean
 *                 example: false
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách item ID từ question bank type vocabulary
 *           example:
 *             title: Quiz từ vựng bài 1
 *             level: Sơ cấp 1
 *             category: nghề nghiệp
 *             timeLimit: 300
 *             passingScore: 80
 *             isActive: true
 *             itemIds:
 *               - 69ef1ad4f2a6ec2f593f2eba
 *     responses:
 *       201:
 *         description: Tạo quiz từ vựng thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/quizzes', admin, createVocabularyQuiz);

/**
 * @swagger
 * /api/v1/vocabularies/quizzes/{quizId}:
 *   get:
 *     summary: Admin lấy chi tiết quiz từ vựng
 *     tags: [Vocabularies]
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
 *         description: Trả về quiz từ vựng
 *       404:
 *         description: Không tìm thấy quiz
 */
router.get('/quizzes/:quizId', admin, getVocabularyQuizById);

/**
 * @swagger
 * /api/v1/vocabularies/quizzes/{quizId}:
 *   patch:
 *     summary: Admin cập nhật quiz từ vựng
 *     tags: [Vocabularies]
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
router.patch('/quizzes/:quizId', admin, updateVocabularyQuiz);

/**
 * @swagger
 * /api/v1/vocabularies/quizzes/{quizId}/items:
 *   patch:
 *     summary: Admin thêm question vocabulary từ bank vào quiz
 *     description: itemIds lấy từ /api/v1/bank/vocabulary.
 *     tags: [Vocabularies]
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
router.patch('/quizzes/:quizId/items', admin, addVocabularyQuizItems);

/**
 * @swagger
 * /api/v1/vocabularies/quizzes/{quizId}/items:
 *   delete:
 *     summary: Admin xóa question vocabulary khỏi quiz
 *     tags: [Vocabularies]
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
router.delete('/quizzes/:quizId/items', admin, removeVocabularyQuizItems);

/**
 * @swagger
 * /api/v1/vocabularies/quizzes/{quizId}/items/reorder:
 *   patch:
 *     summary: Admin sắp xếp thứ tự question vocabulary trong quiz
 *     description: itemIds phải chứa đúng toàn bộ item hiện có trong quiz theo thứ tự mới.
 *     tags: [Vocabularies]
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
router.patch('/quizzes/:quizId/items/reorder', admin, reorderVocabularyQuizItems);

/**
 * @swagger
 * /api/v1/vocabularies/quizzes/{quizId}/publish:
 *   patch:
 *     summary: Admin publish/ẩn quiz từ vựng
 *     tags: [Vocabularies]
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
 *       400:
 *         description: Quiz chưa có câu hỏi
 */
router.patch('/quizzes/:quizId/publish', admin, togglePublishVocabularyQuiz);

/**
 * @swagger
 * /api/v1/vocabularies/quizzes/{quizId}:
 *   delete:
 *     summary: Admin xóa quiz từ vựng
 *     description: Không cho xóa quiz đã có phiên làm bài.
 *     tags: [Vocabularies]
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
 *       400:
 *         description: Quiz đã có phiên làm bài
 */
router.delete('/quizzes/:quizId', admin, deleteVocabularyQuiz);

/**
 * @swagger
 * /api/v1/vocabularies/quiz/start:
 *   post:
 *     summary: Bắt đầu quiz kiểm tra từ vựng
 *     description: Tạo phiên quiz từ VocabularyQuiz đã publish. Có thể truyền quizId hoặc lọc theo level/category để lấy quiz active mới nhất.
 *     tags: [Vocabularies]
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
 *               level:
 *                 type: string
 *               category:
 *                 type: string
 *               limit:
 *                 type: integer
 *                 default: 10
 *           example:
 *             quizId: 69ef1ad4f2a6ec2f593f2eba
 *             limit: 20
 *     responses:
 *       201:
 *         description: Trả về sessionId
 *       400:
 *         description: Không có từ vựng/câu hỏi quiz hợp lệ để tạo phiên
 */
router.post('/quiz/start', startVocabularyQuiz);

/**
 * @swagger
 * /api/v1/vocabularies/quiz/results:
 *   get:
 *     summary: Lấy lịch sử kết quả quiz từ vựng
 *     tags: [Vocabularies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lessonId
 *         description: Nếu truyền lessonId, API lọc từ vựng của lesson và cập nhật tiến độ vocabulary trong LessonProgress.
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Trả về sessions, total, page, pages
 */
router.get('/quiz/results', getVocabularyQuizResults);

/**
 * @swagger
 * /api/v1/vocabularies/quiz/session/{sessionId}:
 *   get:
 *     summary: Lấy phiên quiz từ vựng đang làm
 *     description: Không trả về correctAnswer.
 *     tags: [Vocabularies]
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
 *       404:
 *         description: Không tìm thấy phiên quiz
 */
router.get('/quiz/session/:sessionId', getVocabularyQuizSession);

/**
 * @swagger
 * /api/v1/vocabularies/quiz/session/{sessionId}/save-answer:
 *   post:
 *     summary: Lưu đáp án tạm thời cho quiz từ vựng
 *     tags: [Vocabularies]
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
 *               answer:
 *                 description: string cho short_answer hoặc đáp án đã chọn cho single_choice
 *                 example: học sinh
 *               timeSpent:
 *                 type: number
 *                 example: 120
 *     responses:
 *       200:
 *         description: Lưu đáp án thành công
 */
router.post('/quiz/session/:sessionId/save-answer', saveVocabularyQuizAnswer);

/**
 * @swagger
 * /api/v1/vocabularies/quiz/session/{sessionId}/submit:
 *   post:
 *     summary: Nộp quiz từ vựng
 *     description: Chấm điểm và tự động cập nhật trạng thái nhớ/không nhớ cho từng từ.
 *     tags: [Vocabularies]
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
 *                 example: 300
 *     responses:
 *       200:
 *         description: Trả về kết quả quiz
 *       400:
 *         description: Phiên đã được nộp
 */
router.post('/quiz/session/:sessionId/submit', submitVocabularyQuiz);

/**
 * @swagger
 * /api/v1/vocabularies/quiz/session/{sessionId}/result:
 *   get:
 *     summary: Xem kết quả quiz từ vựng
 *     tags: [Vocabularies]
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
 *         description: Trả về kết quả chi tiết
 *       400:
 *         description: Quiz chưa được nộp
 */
router.get('/quiz/session/:sessionId/result', getVocabularyQuizResult);

/**
 * @swagger
 * /api/v1/vocabularies:
 *   get:
 *     summary: Lấy danh sách từ vựng
 *     description: Student và Admin đều xem được. Hỗ trợ phân trang, search theo word/meaning, lọc level/category/isActive.
 *     tags: [Vocabularies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lessonId
 *         description: Lọc từ vựng theo lesson và cập nhật LessonProgress vocabulary cho student.
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [Sơ cấp 1, Sơ cấp 2, Trung cấp 3, Trung cấp 4, Cao cấp 5, Cao cấp 6]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Trả về vocabularies, total, page, pages
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', getVocabularies);

/**
 * @swagger
 * /api/v1/vocabularies/{id}:
 *   get:
 *     summary: Lấy chi tiết một từ vựng
 *     tags: [Vocabularies]
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
 *         description: Trả về chi tiết từ vựng
 *       404:
 *         description: Không tìm thấy từ vựng
 */
router.get('/:id', getVocabularyById);

/**
 * @swagger
 * /api/v1/vocabularies/{id}/mark:
 *   post:
 *     summary: Đánh dấu trạng thái nhớ/không nhớ của một từ
 *     tags: [Vocabularies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [learning, remembered, forgotten]
 *                 example: remembered/learning/forgotten
 *               answer:
 *                 description: Đáp án hoặc ghi chú lý do học gần nhất
 *                 example: học sinh, sinh viên
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       400:
 *         description: status không hợp lệ
 *       404:
 *         description: Không tìm thấy từ vựng
 */
router.post('/:id/mark', markVocabularyLearningStatus);

// Các API quản trị (Chỉ Admin)
/**
 * @swagger
 * /api/v1/vocabularies:
 *   post:
 *     summary: Tạo từ vựng mới
 *     tags: [Vocabularies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [word, meaning]
 *             properties:
 *               word:
 *                 type: string
 *                 example: học sinh
 *               meaning:
 *                 type: string
 *                 example: học sinh, sinh viên
 *               pronunciationText:
 *                 type: string
 *                 example: học sinh
 *               type:
 *                 type: string
 *                 enum: [noun, verb, adjective, adverb]
 *                 example: noun
 *               isSinoKorean:
 *                 type: boolean
 *                 example: false
 *               hanja:
 *                 type: string
 *                 example: 學生
 *               sinoVietnamese:
 *                 type: string
 *                 example: học sinh
 *               imageUrl:
 *                 type: string
 *                 description: URL ảnh sau khi upload ở /api/v1/upload/image
 *               level:
 *                 type: string
 *                 enum: [Sơ cấp 1, Sơ cấp 2, Trung cấp 3, Trung cấp 4, Cao cấp 5, Cao cấp 6]
 *                 example: Sơ cấp 1
 *               category:
 *                 type: string
 *                 example: nghề nghiệp
 *               examples:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [korean, vietnamese]
 *                   properties:
 *                     korean:
 *                       type: string
 *                       example: 저는 학생입니다.
 *                     vietnamese:
 *                       type: string
 *                       example: Tôi là học sinh.
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Tạo từ vựng thành công
 *       400:
 *         description: Thiếu word hoặc meaning
 *       409:
 *         description: Từ vựng đã tồn tại
 */
router.post('/', admin, createVocabulary);

/**
 * @swagger
 * /api/v1/vocabularies/import:
 *   post:
 *     summary: Import hàng loạt từ vựng từ file Excel
 *     description: Chỉ admin. Field form-data phải là file. Hỗ trợ .xlsx/.xls với các cột tiếng Việt hoặc key tiếng Anh như word, meaning, type, level, category, imageUrl.
 *     tags: [Vocabularies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Import thành công, trả về importedCount và skippedCount
 *       400:
 *         description: Thiếu file hoặc file rỗng/sai định dạng
 */
router.post('/import', admin, upload.single('file'), importVocabularies);

/**
 * @swagger
 * /api/v1/vocabularies/bulk-images:
 *   patch:
 *     summary: Cập nhật ảnh hàng loạt cho từ vựng
 *     description: Chỉ admin. Nếu imageUrl thay đổi, controller sẽ xóa ảnh cũ trên S3.
 *     tags: [Vocabularies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [updates]
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, imageUrl]
 *                   properties:
 *                     id:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                 example:
 *                   - id: 69ef1ad4f2a6ec2f593f2eba
 *                     imageUrl: https://salio-storage-assets.s3.ap-southeast-1.amazonaws.com/images/student.png
 *     responses:
 *       200:
 *         description: Trả về successCount
 *       400:
 *         description: updates không hợp lệ
 */
router.patch('/bulk-images', admin, updateBulkImages);

/**
 * @swagger
 * /api/v1/vocabularies/{id}:
 *   patch:
 *     summary: Cập nhật từ vựng
 *     description: Chỉ admin. Nếu imageUrl thay đổi, controller sẽ xóa ảnh cũ trên S3.
 *     tags: [Vocabularies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *           example:
 *             meaning: học sinh, sinh viên
 *             category: con người
 *             imageUrl: https://salio-storage-assets.s3.ap-southeast-1.amazonaws.com/images/student.png
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy từ vựng
 */
router.patch('/:id', admin, updateVocabulary);

/**
 * @swagger
 * /api/v1/vocabularies/{id}/publish:
 *   patch:
 *     summary: Bật/tắt trạng thái hiển thị của từ vựng
 *     tags: [Vocabularies]
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
 *         description: Đổi trạng thái thành công
 *       404:
 *         description: Không tìm thấy từ vựng
 */
router.patch('/:id/publish', admin, togglePublishVocabulary);

/**
 * @swagger
 * /api/v1/vocabularies/{id}:
 *   delete:
 *     summary: Xóa từ vựng
 *     description: Chỉ admin. Không cho xóa nếu từ đang nằm trong FlashcardSet hoặc danh sách yêu thích của học viên; nếu có imageUrl thì xóa file trên S3.
 *     tags: [Vocabularies]
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
 *       400:
 *         description: Từ vựng đang được sử dụng
 *       404:
 *         description: Không tìm thấy từ vựng
 */
router.delete('/:id', admin, deleteVocabulary);

export default router;