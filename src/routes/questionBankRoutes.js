import express from 'express';
import {
    getBankItems,
    createBankItem,
    getBankItemById,
    updateBankItem,
    deleteBankItem
} from '../controllers/questionBankController.js';

import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

// --- BẢO MẬT: CHỈ ADMIN/TEACHER MỚI ĐƯỢC PHÉP TRUY CẬP ---
// Áp dụng middleware kiểm tra đăng nhập và quyền Admin cho TOÀN BỘ các route bên dưới
router.use(protect);
router.use(admin);

/**
 * @swagger
 * /api/v1/bank/{type}:
 *   get:
 *     summary: Lấy danh sách item trong question bank
 *     description: Chỉ user role admin. type chọn model tương ứng Reading, Listening, Writing hoặc Speaking. Hỗ trợ lọc theo level, difficulty, isActive và tags.
 *     tags: [Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, writing, speaking]
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: tags
 *         description: Nhiều tag cách nhau bằng dấu phẩy
 *         schema:
 *           type: string
 *           example: TOPIK,reading
 *     responses:
 *       200:
 *         description: Trả về success, count và data
 *       400:
 *         description: Type không hợp lệ
 */
router.get('/:type', getBankItems);

/**
 * @swagger
 * /api/v1/bank/{type}:
 *   post:
 *     summary: Tạo item mới trong question bank
 *     description: Chỉ user role admin. Body phụ thuộc type. Controller ghi thêm createdBy từ user đang đăng nhập.
 *     tags: [Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, writing, speaking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, level, questions]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "[1~2] ( )에 들어갈 말로 가장 알맞은 것을 고르십시오."
 *               content:
 *                 type: string
 *                 description: Dùng cho reading
 *                 example: ""
 *               translation:
 *                 type: string
 *                 description: Dùng cho reading
 *                 example: ""
 *               level:
 *                 type: string
 *                 enum: [Sơ cấp 1, Sơ cấp 2, Trung cấp 3, Trung cấp 4, Cao cấp 5, Cao cấp 6]
 *                 example: Trung cấp 3
 *               difficulty:
 *                 type: string
 *                 enum: [Dễ, Trung bình, Khó]
 *                 example: Dễ
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [Đề 96, TOPIK, Điền vào chỗ trống]
 *               audioUrl:
 *                 type: string
 *                 description: Dùng cho listening hoặc question audio
 *               duration:
 *                 type: number
 *                 description: Dùng cho listening
 *               scripts:
 *                 type: array
 *                 items:
 *                   type: object
 *               prompt:
 *                 type: string
 *                 description: Dùng cho writing/speaking
 *               instruction:
 *                 type: string
 *                 description: Dùng cho writing/speaking
 *               attachedImage:
 *                 type: string
 *                 description: Dùng cho writing
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [type, correctAnswer]
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [single_choice, multiple_choice, true_false, matching, short_answer]
 *                       example: single_choice
 *                     points:
 *                       type: number
 *                       example: 2
 *                     audioUrl:
 *                       type: string
 *                       description: Audio riêng cho câu hỏi nếu có
 *                     scripts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           startTime:
 *                             type: number
 *                           endTime:
 *                             type: number
 *                           korean:
 *                             type: string
 *                           vietnamese:
 *                             type: string
 *                     questionText:
 *                       type: string
 *                       example: 감기약을 (     ) 열이 내렸다.
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         options:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: [먹느라고, 먹더라도, 먹을 텐데, 먹고 나서]
 *                         matchingPairs:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               bottomItem:
 *                                 type: string
 *                               topItem:
 *                                 type: string
 *                         blankCount:
 *                           type: number
 *                     correctAnswer:
 *                       description: String, array hoặc object tùy theo type câu hỏi
 *                       example: 먹고 나서
 *                     explanation:
 *                       type: string
 *                       example: "'감기약을 먹고 나서 열이 내렸다' nghĩa là 'sau khi uống thuốc cảm thì hạ sốt'."
 *           example:
 *             title: "[1~2] ( )에 들어갈 말로 가장 알맞은 것을 고르십시오."
 *             content: ""
 *             translation: ""
 *             questions:
 *               - type: single_choice
 *                 points: 2
 *                 questionText: "감기약을 (     ) 열이 내렸다."
 *                 metadata:
 *                   options:
 *                     - 먹느라고
 *                     - 먹더라도
 *                     - 먹을 텐데
 *                     - 먹고 나서
 *                   matchingPairs: []
 *                 correctAnswer: 먹고 나서
 *                 explanation: "'감기약을 먹고 나서 열이 내렸다' nghĩa là 'sau khi uống thuốc cảm thì hạ sốt'."
 *                 scripts: []
 *             level: Trung cấp 3
 *             difficulty: Dễ
 *             tags:
 *               - Đề 96
 *               - TOPIK
 *               - Điền vào chỗ trống
 *             isActive: true
 *     responses:
 *       201:
 *         description: Tạo item thành công
 *       400:
 *         description: Type hoặc data không hợp lệ
 */
router.post('/:type', createBankItem);

/**
 * @swagger
 * /api/v1/bank/{type}/{itemId}:
 *   get:
 *     summary: Lấy chi tiết một item trong bank
 *     tags: [Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, writing, speaking]
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về data item
 *       400:
 *         description: Type không hợp lệ
 *       404:
 *         description: Không tìm thấy item
 */
router.get('/:type/:itemId', getBankItemById);

/**
 * @swagger
 * /api/v1/bank/{type}/{itemId}:
 *   patch:
 *     summary: Cập nhật item trong bank
 *     description: Nếu audioUrl hoặc attachedImage thay đổi, controller sẽ xóa file cũ trên S3.
 *     tags: [Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, writing, speaking]
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
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Type hoặc data không hợp lệ
 *       404:
 *         description: Không tìm thấy item
 */
router.patch('/:type/:itemId', updateBankItem);

/**
 * @swagger
 * /api/v1/bank/{type}/{itemId}:
 *   delete:
 *     summary: Xóa item khỏi bank
 *     description: Không cho xóa reading/listening/writing nếu item đang được Exam sử dụng; nếu có audioUrl/attachedImage thì xóa file trên S3.
 *     tags: [Question Bank]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reading, listening, writing, speaking]
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Type không hợp lệ hoặc item đang được Exam sử dụng
 *       404:
 *         description: Không tìm thấy item
 */
router.delete('/:type/:itemId', deleteBankItem);

export default router;