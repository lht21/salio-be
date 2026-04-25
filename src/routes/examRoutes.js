import express from 'express';
import {
    getAllExams,
    createExam,
    getExamById,
    updateExam,
    deleteExam,
    togglePublishExam,
    assembleExam
} from '../controllers/examController.js'; // Nhớ chú ý viết đúng chữ hoa/thường nếu hệ điều hành phân biệt

import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

// --- BẢO MẬT: CHỈ ADMIN MỚI ĐƯỢC PHÉP TRUY CẬP VÀ QUẢN LÝ ĐỀ THI ---
// Áp dụng middleware kiểm tra đăng nhập và quyền Admin cho TOÀN BỘ các route bên dưới
router.use(protect);
router.use(admin);

router.route('/')
    .get(getAllExams)
    .post(createExam);

router.route('/:examId')
    .get(getExamById)
    .patch(updateExam)
    .delete(deleteExam);

router.patch('/:examId/publish', togglePublishExam);
router.patch('/:examId/assemble', assembleExam);

export default router;