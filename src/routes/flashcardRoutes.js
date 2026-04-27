import express from 'express';
import {
    getFlashcardSets,
    createFlashcardSet,
    getFlashcardSetById,
    updateFlashcardSet,
    deleteFlashcardSet,
    addCardsToSet,
    removeCardFromSet
} from '../controllers/flashcardController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Tất cả các API Flashcard đều yêu cầu User đăng nhập
router.use(protect);

/**
 * @swagger
 * /api/v1/flashcard-sets:
 *   get:
 *     summary: Lấy danh sách bộ flashcard
 *     description: type=public trả về bộ public; mặc định trả về bộ của user đang đăng nhập.
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [my_sets, public]
 *           example: my_sets
 *     responses:
 *       200:
 *         description: Trả về danh sách bộ flashcard
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', getFlashcardSets);

/**
 * @swagger
 * /api/v1/flashcard-sets:
 *   post:
 *     summary: Tạo bộ flashcard mới
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Từ vựng bài 1
 *               description:
 *                 type: string
 *                 example: Bộ từ vựng nhập môn tiếng Hàn
 *               isPublic:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Tạo bộ flashcard thành công
 *       400:
 *         description: Thiếu name
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/', createFlashcardSet);

/**
 * @swagger
 * /api/v1/flashcard-sets/{id}:
 *   get:
 *     summary: Lấy chi tiết bộ flashcard
 *     description: id có thể là ObjectId của FlashcardSet hoặc "favorite" để lấy danh sách từ vựng yêu thích.
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: favorite
 *     responses:
 *       200:
 *         description: Trả về bộ flashcard, cards được populate nếu là bộ thường
 *       403:
 *         description: Không có quyền xem bộ private
 *       404:
 *         description: Không tìm thấy bộ flashcard
 */
router.get('/:id', getFlashcardSetById);

/**
 * @swagger
 * /api/v1/flashcard-sets/{id}:
 *   patch:
 *     summary: Cập nhật bộ flashcard
 *     description: Chỉ owner của bộ flashcard được cập nhật; không cập nhật được bộ favorite mặc định.
 *     tags: [Flashcards]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Từ vựng bài 1 - đã ôn
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Không thể cập nhật favorite
 *       404:
 *         description: Không tìm thấy hoặc không có quyền
 */
router.patch('/:id', updateFlashcardSet);

/**
 * @swagger
 * /api/v1/flashcard-sets/{id}:
 *   delete:
 *     summary: Xóa bộ flashcard
 *     description: Chỉ owner của bộ flashcard được xóa; không xóa được bộ favorite mặc định.
 *     tags: [Flashcards]
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
 *         description: Không thể xóa favorite
 *       404:
 *         description: Không tìm thấy hoặc không có quyền
 */
router.delete('/:id', deleteFlashcardSet);

/**
 * @swagger
 * /api/v1/flashcard-sets/{id}/cards:
 *   post:
 *     summary: Thêm từ vựng vào bộ flashcard
 *     description: id có thể là ObjectId của bộ flashcard hoặc "favorite" để lưu vào mục yêu thích.
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: favorite
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vocabIds]
 *             properties:
 *               vocabIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["69ef1ad4f2a6ec2f593f2eba"]
 *     responses:
 *       200:
 *         description: Thêm từ vựng thành công
 *       400:
 *         description: vocabIds không phải mảng
 *       404:
 *         description: Không tìm thấy bộ flashcard hoặc không có quyền
 */
router.post('/:id/cards', addCardsToSet);

/**
 * @swagger
 * /api/v1/flashcard-sets/{id}/cards/{vocabId}:
 *   delete:
 *     summary: Xóa một từ vựng khỏi bộ flashcard
 *     description: id có thể là ObjectId của bộ flashcard hoặc "favorite" để xóa khỏi mục yêu thích.
 *     tags: [Flashcards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: favorite
 *       - in: path
 *         name: vocabId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa từ vựng khỏi bộ thành công
 *       404:
 *         description: Không tìm thấy bộ flashcard hoặc không có quyền
 */
router.delete('/:id/cards/:vocabId', removeCardFromSet);

export default router;
