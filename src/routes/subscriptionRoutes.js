import express from 'express';
import {
    getPlans,
    createPlan,
    getPlanById,
    updatePlan,
    deletePlan,
    getCurrentSubscription,
    getPaymentHistory,
    checkoutPlan,
    cancelSubscription
} from '../controllers/subscriptionController.js';

import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/v1/subscriptions/current:
 *   get:
 *     summary: Lấy gói cước hiện tại của user đang đăng nhập
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về subscription hiện tại
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/current', getCurrentSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/history:
 *   get:
 *     summary: Lấy lịch sử thanh toán đã hoàn thành của user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách payment status completed
 */
router.get('/history', getPaymentHistory);

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   get:
 *     summary: Lấy danh sách gói cước
 *     description: Student chỉ thấy gói isActive; admin/teacher thấy tất cả gói.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách gói cước
 */
router.get('/plans', getPlans);

/**
 * @swagger
 * /api/v1/subscriptions/plans/{planId}:
 *   get:
 *     summary: Lấy chi tiết gói cước
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về chi tiết gói cước
 *       404:
 *         description: Không tìm thấy gói cước
 */
router.get('/plans/:planId', getPlanById);

/**
 * @swagger
 * /api/v1/subscriptions/plans/{planId}/checkout:
 *   post:
 *     summary: Tạo phiên thanh toán cho gói cước
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
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
 *               paymentMethod:
 *                 type: string
 *                 enum: [apple_iap, google_play, momo, vnpay, bank_transfer, admin_gift]
 *                 default: momo
 *                 example: momo
 *     responses:
 *       200:
 *         description: Trả về orderId, amount và payUrl
 *       400:
 *         description: Phương thức thanh toán hoặc gói cước không hợp lệ
 */
router.post('/plans/:planId/checkout', checkoutPlan);

/**
 * @swagger
 * /api/v1/subscriptions/cancel:
 *   post:
 *     summary: Hủy tự động gia hạn gói Premium hiện tại
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hủy auto-renew thành công, user vẫn dùng đến hết endDate
 *       400:
 *         description: User không có gói Premium đang hoạt động
 */
router.post('/cancel', cancelSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   post:
 *     summary: Admin tạo gói cước mới
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, price, durationDays]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Premium 1 Tháng
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [premium_monthly, premium_quarterly, premium_yearly, lifetime]
 *                 example: premium_monthly
 *               price:
 *                 type: number
 *                 example: 99000
 *               originalPrice:
 *                 type: number
 *                 example: 149000
 *               durationDays:
 *                 type: number
 *                 example: 30
 *               appleProductId:
 *                 type: string
 *               googleProductId:
 *                 type: string
 *               features:
 *                 type: object
 *               featuresList:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *               isPopular:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Tạo gói cước thành công
 *       400:
 *         description: Thiếu thông tin bắt buộc
 */
router.post('/plans', admin, createPlan);

/**
 * @swagger
 * /api/v1/subscriptions/plans/{planId}:
 *   patch:
 *     summary: Admin cập nhật gói cước
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
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
 *         description: Cập nhật gói cước thành công
 *       404:
 *         description: Không tìm thấy gói cước
 */
router.patch('/plans/:planId', admin, updatePlan);

/**
 * @swagger
 * /api/v1/subscriptions/plans/{planId}:
 *   delete:
 *     summary: Admin ẩn gói cước
 *     description: Soft delete bằng cách set isActive=false.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ẩn gói cước thành công
 *       404:
 *         description: Không tìm thấy gói cước
 */
router.delete('/plans/:planId', admin, deletePlan);

export default router;