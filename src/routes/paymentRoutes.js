import express from 'express';
import {
    getAllPayments,
    getPaymentById,
    updatePaymentStatus,
    handleWebhook,
    verifyIAP,
    grantSubscription
} from '../controllers/paymentController.js';
import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     summary: Webhook nhận kết quả thanh toán từ gateway
 *     description: Public endpoint cho MoMo/VNPay callback. Controller hiện mock theo orderId, resultCode và transactionId.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: SALIO-171234567890
 *               resultCode:
 *                 type: number
 *                 description: 0 là thành công theo quy ước MoMo mock
 *                 example: 0
 *               transactionId:
 *                 type: string
 *                 example: MOMO-TRANSACTION-001
 *     responses:
 *       200:
 *         description: Webhook đã được xử lý hoặc ghi nhận
 */
router.post('/webhook', handleWebhook);

router.use(protect);

/**
 * @swagger
 * /api/v1/payments/verify-iap:
 *   post:
 *     summary: Student verify hóa đơn In-App Purchase
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiptData, platform, planId]
 *             properties:
 *               receiptData:
 *                 type: string
 *                 example: base64-receipt-data
 *               platform:
 *                 type: string
 *                 enum: [apple, google]
 *                 example: apple
 *               planId:
 *                 type: string
 *               transactionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verify IAP thành công và kích hoạt gói
 *       400:
 *         description: Thiếu thông tin hoặc hóa đơn không hợp lệ
 *       404:
 *         description: Gói cước không tồn tại
 */
router.post('/verify-iap', verifyIAP);

/**
 * @swagger
 * /api/v1/payments/{paymentId}:
 *   get:
 *     summary: Lấy chi tiết một đơn thanh toán
 *     description: Student chỉ xem được đơn của mình; admin/teacher xem được tất cả.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về chi tiết payment
 *       400:
 *         description: Không có quyền xem đơn hàng
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.get('/:paymentId', getPaymentById);

router.use(admin); // Khóa quyền cho các route dưới

/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     summary: Admin lấy danh sách thanh toán
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [apple_iap, google_play, momo, vnpay, bank_transfer, admin_gift]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: search
 *         description: Tìm theo orderId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về payments, total, page, pages
 *       403:
 *         description: Không phải admin
 */
router.get('/', getAllPayments);

/**
 * @swagger
 * /api/v1/payments/{paymentId}/status:
 *   patch:
 *     summary: Admin cập nhật trạng thái đơn thanh toán
 *     description: Nếu status chuyển sang completed thì kích hoạt Premium cho user.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
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
 *                 enum: [pending, completed, failed, refunded]
 *                 example: completed
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       400:
 *         description: Trạng thái không hợp lệ hoặc đơn đã completed
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.patch('/:paymentId/status', updatePaymentStatus);

/**
 * @swagger
 * /api/v1/payments/grant:
 *   post:
 *     summary: Admin cấp gói thủ công cho user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, planId]
 *             properties:
 *               userId:
 *                 type: string
 *               planId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cấp gói thủ công thành công
 *       400:
 *         description: Thiếu userId hoặc planId
 */
router.post('/grant', grantSubscription);

export default router;