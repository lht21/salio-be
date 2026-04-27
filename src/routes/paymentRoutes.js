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

// ==========================================
// ROUTES PUBLIC (WEBHOOK TỪ GATEWAY)
// ==========================================
// Không được bảo vệ bởi JWT vì MoMo/VNPay Server sẽ gọi tới API này
router.post('/webhook', handleWebhook);

// Toàn bộ các API bên dưới yêu cầu Đăng nhập
router.use(protect);

// ==========================================
// ROUTES DÀNH CHO STUDENT
// ==========================================
router.post('/verify-iap', verifyIAP);
router.get('/:paymentId', getPaymentById);

// ==========================================
// ROUTES DÀNH CHO ADMIN
// ==========================================
router.use(admin); // Khóa quyền cho các route dưới

router.get('/', getAllPayments);
router.patch('/:paymentId/status', updatePaymentStatus);
router.post('/grant', grantSubscription);

export default router;