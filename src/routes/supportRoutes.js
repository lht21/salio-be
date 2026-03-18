import express from 'express';
import { 
    getTickets, 
    getTicketById, 
    updateTicket, 
    replyTicket, 
    createTicket 
} from '../controllers/supportController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Support
 *   description: Hệ thống hỗ trợ (Tickets), gửi yêu cầu và phản hồi từ Admin
 */

// --- USER ROUTES ---

/**
 * @swagger
 * /api/support:
 *   post:
 *     summary: Người dùng tạo yêu cầu hỗ trợ (Ticket) mới
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Tiêu đề yêu cầu hỗ trợ
 *                 example: "Lỗi thanh toán"
 *               message:
 *                 type: string
 *                 description: Nội dung chi tiết yêu cầu
 *                 example: "Tôi đã thanh toán nhưng chưa nhận được quyền Premium."
 *               category:
 *                 type: string
 *                 description: Phân loại yêu cầu (ví dụ payment, technical, account)
 *     responses:
 *       201:
 *         description: Gửi yêu cầu hỗ trợ thành công
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/', protect, createTicket);

// --- ADMIN ROUTES ---

/**
 * @swagger
 * /api/support:
 *   get:
 *     summary: Lấy danh sách toàn bộ các yêu cầu hỗ trợ (Chỉ Admin)
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách Tickets
 *       403:
 *         description: Không có quyền Admin
 */
router.get('/', protect, admin, getTickets);

/**
 * @swagger
 * /api/support/{id}:
 *   get:
 *     summary: Xem chi tiết một Ticket theo ID (Chỉ Admin)
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của Ticket
 *     responses:
 *       200:
 *         description: Thông tin chi tiết Ticket và lịch sử hội thoại
 */
router.get('/:id', protect, admin, getTicketById);

/**
 * @swagger
 * /api/support/{id}:
 *   patch:
 *     summary: Cập nhật trạng thái hoặc thông tin Ticket (Chỉ Admin)
 *     description: Dùng để thay đổi trạng thái ticket (ví dụ sang 'pending', 'closed', 'resolved').
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, pending, closed, resolved]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/:id', protect, admin, updateTicket);

/**
 * @swagger
 * /api/support/{id}/reply:
 *   post:
 *     summary: Admin gửi phản hồi cho một Ticket
 *     tags: [Support]
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
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Chào bạn, chúng tôi đã kiểm tra và xử lý lỗi của bạn."
 *     responses:
 *       200:
 *         description: Gửi phản hồi thành công
 */
router.post('/:id/reply', protect, admin, replyTicket);

export default router;