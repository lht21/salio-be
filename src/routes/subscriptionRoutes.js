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

// Tất cả các API subscription đều yêu cầu đăng nhập
router.use(protect);

// ==========================================
// ROUTES DÀNH CHO STUDENT & ADMIN
// ==========================================
router.get('/current', getCurrentSubscription);
router.get('/history', getPaymentHistory);
router.get('/plans', getPlans);
router.get('/plans/:planId', getPlanById);
router.post('/plans/:planId/checkout', checkoutPlan);
router.post('/cancel', cancelSubscription);

// ==========================================
// ROUTES CHỈ DÀNH CHO ADMIN
// ==========================================
router.post('/plans', admin, createPlan);
router.patch('/plans/:planId', admin, updatePlan);
router.delete('/plans/:planId', admin, deletePlan);

export default router;