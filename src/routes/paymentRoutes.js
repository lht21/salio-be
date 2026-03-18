import express from 'express';
import { getTransactions, refundTransaction, getPaymentStatsToday } from '../controllers/paymentController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/logMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Quản lý giao dịch thanh toán, hoàn tiền và thống kê doanh thu (Admin Only)
 */

// Áp dụng bảo mật Admin và ghi log cho toàn bộ các route thanh toán
router.use(protect, admin, logActivity);

/**
 * @swagger
 * /api/payment:
 *   get:
 *     summary: Lấy danh sách toàn bộ giao dịch thanh toán
 *     description: Trả về danh sách lịch sử giao dịch từ người dùng (Gói học, đăng ký premium...).
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về mảng danh sách giao dịch thành công
 *       401:
 *         description: Chưa đăng nhập hoặc Token không hợp lệ
 *       403:
 *         description: Không có quyền Admin để xem giao dịch
 */
// Lấy danh sách giao dịch
router.get('/', getTransactions);

/**
 * @swagger
 * /api/payment/{id}/refund:
 *   post:
 *     summary: Hoàn tiền cho một giao dịch cụ thể
 *     description: Xử lý yêu cầu hoàn tiền dựa trên ID giao dịch.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của giao dịch cần hoàn tiền
 *     responses:
 *       200:
 *         description: Giao dịch đã được hoàn tiền thành công
 *       400:
 *         description: Giao dịch không hợp lệ hoặc đã hoàn tiền trước đó
 *       404:
 *         description: Không tìm thấy giao dịch
 */
// Hoàn tiền
router.post('/:id/refund', refundTransaction);

/**
 * @swagger
 * /api/payment/stats:
 *   get:
 *     summary: Lấy số liệu thống kê doanh thu trong ngày hôm nay
 *     description: Trả về tổng doanh thu, số lượng giao dịch thành công phát sinh trong ngày.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu thống kê doanh thu hôm nay
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: number
 *                 transactionCount:
 *                   type: integer
 */
router.get('/stats', getPaymentStatsToday )

export default router;