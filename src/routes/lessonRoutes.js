import express from 'express';
import {
    getLessons,
    createLesson,
    getLessonById,
    updateLesson,
    deleteLesson,
    publishLesson,
    unpublishLesson,
    reorderLessons,
    getLessonProgress,
    updateLessonSectionProgress,
    getLessonSkillItem,
    submitLessonSkillItem,
    submitLessonSpeakingAudio,
    getLessonSkillResult,
    evaluateLessonSpeakingSubmission,
    startLesson,
    completeLesson,
    getLessonModules,
    addLessonModule,
    removeLessonModule,
    getLessonFinalTest,
    createLessonFinalTest,
    assembleLessonFinalTest,
    reorderLessonFinalTestItems,
    removeLessonFinalTestItems,
    startLessonFinalTest,
    getLessonFinalTestSession,
    saveLessonFinalTestAnswer,
    submitLessonFinalTestSession,
    getLessonFinalTestResult
} from '../controllers/lessonController.js';
import { protect, admin } from '../middlewares/auth.js';
import { uploadAudio } from '../middlewares/upload.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   - name: Lessons
 *     description: Quản lý lesson, module và tiến độ học tập
 */

/**
 * @swagger
 * /api/v1/lessons:
 *   get:
 *     summary: Lấy danh sách lesson
 *     description: Student chỉ được lấy lesson đã publish, admin lấy toàn bộ lesson chưa bị xóa mềm.
 *     tags: [Lessons]
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
 *         name: isPublished
 *         description: Chỉ admin dùng filter này.
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
 *         description: Trả về lessons, total, page, pages
 */
router.get('/', getLessons);

/**
 * @swagger
 * /api/v1/lessons:
 *   post:
 *     summary: Admin tạo lesson mới
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, title, level]
 *             properties:
 *               code:
 *                 type: string
 *                 example: lesson-1
 *               title:
 *                 type: string
 *                 example: Bài 1 - Giới thiệu bản thân
 *               level:
 *                 type: string
 *                 enum: [Sơ cấp 1, Sơ cấp 2, Trung cấp 3, Trung cấp 4, Cao cấp 5, Cao cấp 6]
 *               description:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *               order:
 *                 type: number
 *                 description: Nếu bỏ trống, server tự động thêm sau lesson cuối.
 *               isPremium:
 *                 type: boolean
 *               estimatedDuration:
 *                 type: number
 *               isPublished:
 *                 type: boolean
 *           example:
 *             code: lesson-1
 *             title: Bài 1 - Giới thiệu bản thân
 *             level: Sơ cấp 1
 *             description: Từ vựng, ngữ pháp và kỹ năng cơ bản để chào hỏi.
 *             order: 1
 *             estimatedDuration: 60
 *             isPublished: false
 *     responses:
 *       201:
 *         description: Tạo lesson thành công
 */
router.post('/', admin, createLesson);

/**
 * @swagger
 * /api/v1/lessons/reorder:
 *   patch:
 *     summary: Admin thay đổi thứ tự lesson trong roadmap
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessons]
 *             properties:
 *               lessons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [lessonId, order]
 *                   properties:
 *                     lessonId:
 *                       type: string
 *                     order:
 *                       type: number
 *           example:
 *             lessons:
 *               - lessonId: 69ef1ad4f2a6ec2f593f2eba
 *                 order: 1
 *               - lessonId: 69ef1ad4f2a6ec2f593f2ebb
 *                 order: 2
 *     responses:
 *       200:
 *         description: Sắp xếp lesson thành công
 */
router.patch('/reorder', admin, reorderLessons);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/final-test:
 *   get:
 *     summary: Lấy final test của một lesson
 *     description: Student nhận đề đã ẩn đáp án; admin nhận đầy đủ đáp án và explanation.
 *     tags: [Lessons]
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
 *         description: Trả về Quiz type lesson_final đã populate sections
 *       404:
 *         description: Lesson chưa có final test hoặc không tìm thấy lesson
 */
router.get('/:lessonId/final-test', getLessonFinalTest);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/final-test:
 *   post:
 *     summary: Admin tạo final test cho lesson
 *     description: Mỗi lesson chỉ có một final test. Sau khi tạo, dùng assemble để lấy item từ question bank vào sections.
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               passingScore:
 *                 type: number
 *               timeLimit:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *           example:
 *             title: Final Test - Bài 1
 *             description: Kiểm tra tổng hợp cuối bài 1
 *             passingScore: 80
 *             timeLimit: 900
 *             isActive: false
 *     responses:
 *       201:
 *         description: Tạo final test thành công
 *       400:
 *         description: Lesson đã có final test
 */
router.post('/:lessonId/final-test', admin, createLessonFinalTest);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/final-test/assemble:
 *   patch:
 *     summary: Admin lấy item từ question bank vào final test
 *     description: Final test dùng Quiz.sections và lấy item từ bank/listening, bank/reading, bank/writing, bank/speaking.
 *     tags: [Lessons]
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
 *             required: [sectionType, itemIds]
 *             properties:
 *               sectionType:
 *                 type: string
 *                 enum: [listening, reading, writing, speaking]
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               mode:
 *                 type: string
 *                 enum: [append, replace]
 *                 default: append
 *           example:
 *             sectionType: reading
 *             itemIds:
 *               - 69eca1d3dab38692c57c6840
 *             mode: append
 *     responses:
 *       200:
 *         description: Trả về final test đã populate section vừa lắp
 */
router.patch('/:lessonId/final-test/assemble', admin, assembleLessonFinalTest);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/final-test/questions/reorder:
 *   patch:
 *     summary: Admin sắp xếp item trong section final test
 *     tags: [Lessons]
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
 *             required: [sectionType, itemIds]
 *             properties:
 *               sectionType:
 *                 type: string
 *                 enum: [listening, reading, writing, speaking]
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             sectionType: reading
 *             itemIds:
 *               - 69eca1d3dab38692c57c6840
 *               - 69ec9379905f1e609e1d6efd
 *     responses:
 *       200:
 *         description: Sắp xếp thành công
 */
router.patch('/:lessonId/final-test/questions/reorder', admin, reorderLessonFinalTestItems);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/final-test/questions/remove:
 *   patch:
 *     summary: Admin gỡ item khỏi section final test
 *     tags: [Lessons]
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
 *             required: [sectionType, itemIds]
 *             properties:
 *               sectionType:
 *                 type: string
 *                 enum: [listening, reading, writing, speaking]
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             sectionType: reading
 *             itemIds:
 *               - 69eca1d3dab38692c57c6840
 *     responses:
 *       200:
 *         description: Gỡ item thành công
 */
router.patch('/:lessonId/final-test/questions/remove', admin, removeLessonFinalTestItems);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/final-test/start:
 *   post:
 *     summary: Student bắt đầu final test của lesson
 *     description: Chỉ mở khi LessonProgress.finalTestStatus.isUnlocked = true và final test đã publish.
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Trả về sessionId
 *       400:
 *         description: Chưa hoàn thành đủ phần học hoặc final test chưa có câu hỏi
 */
router.post('/:lessonId/final-test/start', startLessonFinalTest);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/final-test/session/{sessionId}:
 *   get:
 *     summary: Student lấy phiên final test đang làm
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về session và quiz đã ẩn đáp án
 */
router.get('/:lessonId/final-test/session/:sessionId', getLessonFinalTestSession);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/final-test/session/{sessionId}/save-answer:
 *   post:
 *     summary: Student lưu đáp án tạm thời cho final test
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
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
 *                 enum: [quiz, listening, reading, writing, speaking]
 *               itemId:
 *                 type: string
 *                 description: Bắt buộc nếu sectionType khác quiz.
 *               questionId:
 *                 type: string
 *               answer: {}
 *               timeSpent:
 *                 type: number
 *           example:
 *             sectionType: reading
 *             itemId: 69eca1d3dab38692c57c6840
 *             questionId: 69eca1d3dab38692c57c6841
 *             answer: Đáp án của câu hỏi
 *             timeSpent: 120
 *     responses:
 *       200:
 *         description: Lưu đáp án thành công
 */
router.post('/:lessonId/final-test/session/:sessionId/save-answer', saveLessonFinalTestAnswer);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/final-test/session/{sessionId}/submit:
 *   post:
 *     summary: Student nộp final test
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
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
 *           example:
 *             timeSpent: 900
 *     responses:
 *       200:
 *         description: Trả về QuizSession đã chấm điểm
 */
router.post('/:lessonId/final-test/session/:sessionId/submit', submitLessonFinalTestSession);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/final-test/session/{sessionId}/result:
 *   get:
 *     summary: Student xem kết quả final test
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về session và quiz đầy đủ để xem đáp án/explanation
 */
router.get('/:lessonId/final-test/session/:sessionId/result', getLessonFinalTestResult);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}:
 *   get:
 *     summary: Xem chi tiết một lesson
 *     tags: [Lessons]
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
 *         description: Trả về lesson đã populate module
 *       404:
 *         description: Không tìm thấy lesson
 */
router.get('/:lessonId', getLessonById);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}:
 *   patch:
 *     summary: Admin cập nhật thông tin lesson
 *     description: Endpoint này chỉ cập nhật metadata. Muốn thêm/gỡ module thì dùng nhóm endpoint /modules.
 *     tags: [Lessons]
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
 *               code:
 *                 type: string
 *               title:
 *                 type: string
 *               level:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *               order:
 *                 type: number
 *               isPremium:
 *                 type: boolean
 *               estimatedDuration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cập nhật lesson thành công
 */
router.patch('/:lessonId', admin, updateLesson);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}:
 *   delete:
 *     summary: Admin xóa một lesson
 *     tags: [Lessons]
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
 *         description: Xóa một lesson thành công
 */
router.delete('/:lessonId', admin, deleteLesson);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/publish:
 *   patch:
 *     summary: Admin publish lesson
 *     tags: [Lessons]
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
 *         description: Đã publish lesson
 */
router.patch('/:lessonId/publish', admin, publishLesson);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/unpublish:
 *   patch:
 *     summary: Admin ẩn lesson khỏi phía học sinh
 *     tags: [Lessons]
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
 *         description: Đã ẩn lesson
 */
router.patch('/:lessonId/unpublish', admin, unpublishLesson);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/progress:
 *   get:
 *     summary: Student xem tiến độ học tập trong lesson
 *     tags: [Lessons]
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
 *         description: Trả về LessonProgress
 *       404:
 *         description: Student chưa bắt đầu lesson
 */
router.get('/:lessonId/progress', getLessonProgress);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/progress/sections/{sectionType}/items/{itemId}:
 *   patch:
 *     summary: Cập nhật tiến độ và điểm số của một item trong lesson
 *     description: |
 *       Dùng sau khi user hoàn thành quiz từ vựng, quiz ngữ pháp, bài nghe, đọc, nói hoặc viết.
 *       Kết quả chi tiết nằm ở session/submission tương ứng; LessonProgress chỉ lưu điểm tổng, breakdown và con trỏ resultRef.
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sectionType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vocabulary, grammar, listening, speaking, reading, writing]
 *       - in: path
 *         name: itemId
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
 *               status:
 *                 type: string
 *                 enum: [learning, completed]
 *                 default: completed
 *               score:
 *                 type: number
 *               maxScore:
 *                 type: number
 *                 default: 100
 *               percentage:
 *                 type: number
 *               resultKind:
 *                 type: string
 *                 enum: [VocabularyQuizSession, GrammarQuizSession, QuizSession, SpeakingSubmission, WritingSubmission, Manual]
 *               resultId:
 *                 type: string
 *               breakdown:
 *                 type: object
 *               title:
 *                 type: string
 *           examples:
 *             vocabulary:
 *               summary: Lưu điểm tổng quiz từ vựng
 *               value:
 *                 status: completed
 *                 percentage: 85
 *                 resultKind: VocabularyQuizSession
 *                 resultId: 69ef1ad4f2a6ec2f593f2eba
 *             reading:
 *               summary: Lưu điểm đọc kèm breakdown
 *               value:
 *                 status: completed
 *                 percentage: 78
 *                 resultKind: QuizSession
 *                 resultId: 69ef1ad4f2a6ec2f593f2ebb
 *                 breakdown:
 *                   trueFalse: 80
 *                   vocabularyClassification: 70
 *                   deepComprehension: 85
 *             listening:
 *               summary: Lưu điểm nghe kèm breakdown
 *               value:
 *                 status: completed
 *                 percentage: 82
 *                 resultKind: QuizSession
 *                 resultId: 69ef1ad4f2a6ec2f593f2ebc
 *                 breakdown:
 *                   trueFalse: 90
 *                   choice: 80
 *                   deepComprehension: 75
 *     responses:
 *       200:
 *         description: Cập nhật LessonProgress thành công
 */
router.patch('/:lessonId/progress/sections/:sectionType/items/:itemId', updateLessonSectionProgress);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/skills/{sectionType}/{itemId}:
 *   get:
 *     summary: Student lấy bài nghe, nói, đọc hoặc viết trong lesson
 *     description: Reading/listening sẽ ẩn correctAnswer và explanation trước khi trả về.
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sectionType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [listening, speaking, reading, writing]
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về item kỹ năng thuộc lesson
 */
router.get('/:lessonId/skills/:sectionType/:itemId', getLessonSkillItem);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/skills/{sectionType}/{itemId}/submit:
 *   post:
 *     summary: Student nộp bài nghe, nói, đọc hoặc viết trong lesson
 *     description: Reading/listening tự chấm và lưu LessonSkillResult. Writing tạo WritingSubmission. Speaking tạo SpeakingSubmission.
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sectionType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [listening, speaking, reading, writing]
 *       - in: path
 *         name: itemId
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
 *           examples:
 *             reading:
 *               summary: Nộp bài đọc hoặc nghe
 *               value:
 *                 answers:
 *                   - questionId: 69eca1d3dab38692c57c6841
 *                     answer: Đáp án của học viên
 *                 timeSpent: 300
 *             writing:
 *               summary: Nộp bài viết
 *               value:
 *                 content: Nội dung bài viết của học viên
 *                 timeSpent: 600
 *             speaking:
 *               summary: Nộp bài nói
 *               value:
 *                 audioUrl: https://example.com/audio.mp3
 *                 recordingDuration: 90
 *                 fileSize: 123456
 *                 aiEvaluation:
 *                   pronunciation: 82
 *                   intonation: 78
 *                   accuracy: 85
 *                   fluency: 80
 *                   percentage: 81
 *                   transcript: Nội dung AI nhận diện được
 *     responses:
 *       200:
 *         description: Trả về result/submission và LessonProgress mới nhất
 */
router.post('/:lessonId/skills/:sectionType/:itemId/submit', submitLessonSkillItem);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/skills/speaking/{itemId}/submit-audio:
 *   post:
 *     summary: Student upload audio bài nói và để BE tự chấm AI
 *     description: Field form-data bắt buộc là file audio. BE lưu file lên S3, tạo SpeakingSubmission, gọi Azure/OpenAI hoặc Gemini để chấm và cập nhật progress.
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, recordingDuration]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               recordingDuration:
 *                 type: number
 *               timeSpent:
 *                 type: number
 *     responses:
 *       201:
 *         description: Trả về SpeakingSubmission đã chấm và LessonProgress mới nhất
 */
router.post('/:lessonId/skills/speaking/:itemId/submit-audio', uploadAudio.single('file'), submitLessonSpeakingAudio);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/skills/speaking/{itemId}/submissions/{submissionId}/evaluate:
 *   patch:
 *     summary: AI hoặc Admin chấm bài nói và cập nhật tiến độ
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: submissionId
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
 *               pronunciation:
 *                 type: number
 *                 example: 82
 *               intonation:
 *                 type: number
 *                 example: 78
 *               accuracy:
 *                 type: number
 *                 example: 85
 *               fluency:
 *                 type: number
 *                 example: 80
 *               percentage:
 *                 type: number
 *                 example: 81
 *               transcript:
 *                 type: string
 *               feedback:
 *                 type: string
 *               suggestions:
 *                 type: string
 *               provider:
 *                 type: string
 *                 example: salio-speaking-ai
 *     responses:
 *       200:
 *         description: Trả về SpeakingSubmission đã chấm và LessonProgress mới nhất
 */
router.patch('/:lessonId/skills/speaking/:itemId/submissions/:submissionId/evaluate', admin, evaluateLessonSpeakingSubmission);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/skills/{sectionType}/{itemId}/result:
 *   get:
 *     summary: Student xem kết quả gần nhất của một bài kỹ năng trong lesson
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sectionType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [listening, speaking, reading, writing]
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về LessonSkillResult, WritingSubmission hoặc SpeakingSubmission
 */
router.get('/:lessonId/skills/:sectionType/:itemId/result', getLessonSkillResult);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/start:
 *   post:
 *     summary: Student bắt đầu học lesson
 *     tags: [Lessons]
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
 *         description: Tạo hoặc cập nhật LessonProgress
 */
router.post('/:lessonId/start', startLesson);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/complete:
 *   post:
 *     summary: Student đánh dấu lesson đã hoàn thành
 *     tags: [Lessons]
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
 *         description: Đánh dấu lesson hoàn thành thành công
 */
router.post('/:lessonId/complete', completeLesson);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/modules:
 *   get:
 *     summary: Lấy danh sách module đã thêm vào lesson
 *     tags: [Lessons]
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
 *         description: Trả về vocabulary, vocabularyQuizzes, grammar, grammarQuizzes, listening, speaking, reading, writing và finalTest
 */
router.get('/:lessonId/modules', getLessonModules);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/modules:
 *   post:
 *     summary: Admin thêm module vào lesson
 *     description: |
 *       moduleType hỗ trợ: vocabulary, vocabularyQuiz, grammar, grammarQuiz, listening, speaking, reading, writing, finalTest.
 *       Vocabulary/grammar là nội dung học. VocabularyQuiz/grammarQuiz là quiz riêng lẻ câu hỏi từ question bank. Listening/reading/speaking/writing là item từ question bank.
 *     tags: [Lessons]
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
 *             required: [moduleType]
 *             properties:
 *               moduleType:
 *                 type: string
 *                 enum: [vocabulary, vocabularyQuiz, grammar, grammarQuiz, listening, speaking, reading, writing, finalTest]
 *               moduleId:
 *                 type: string
 *               moduleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *           examples:
 *             addVocabulary:
 *               summary: Thêm từ vựng / ngữ pháp vào lesson
 *               value:
 *                 moduleType: vocabulary / grammar
 *                 moduleIds: [69ef1ad4f2a6ec2f593f2eba, 69ef1ad4f2a6ec2f593f2ebb]
 *             addVocabularyQuiz:
 *               summary: Thêm quiz từ vựng hoặc grammar vào lesson
 *               value:
 *                 moduleType: vocabularyQuiz / grammarQuiz
 *                 moduleId: 69ef1ad4f2a6ec2f593f2ebc
 *             addReadingBankItem:
 *               summary: Thêm item từ question bank vào lesson
 *               value:
 *                 moduleType: reading / listening / speaking / writing
 *                 moduleId: 69ef1ad4f2a6ec2f593f2ebd
 *     responses:
 *       200:
 *         description: Thêm module vào lesson thành công
 */
router.post('/:lessonId/modules', admin, addLessonModule);

/**
 * @swagger
 * /api/v1/lessons/{lessonId}/modules/{moduleType}/{moduleId}:
 *   delete:
 *     summary: Admin gỡ một module khỏi lesson
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vocabulary, vocabularyQuiz, grammar, grammarQuiz, listening, speaking, reading, writing, finalTest]
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gỡ module khỏi lesson thành công
 */
router.delete('/:lessonId/modules/:moduleType/:moduleId', admin, removeLessonModule);

export default router;
