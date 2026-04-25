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

router.route('/:type')
    .get(getBankItems)
    .post(createBankItem);

router.route('/:type/:itemId')
    .get(getBankItemById)
    .patch(updateBankItem)
    .delete(deleteBankItem);

export default router;