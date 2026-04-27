import express from 'express';
import {
    getVocabularies,
    createVocabulary,
    getVocabularyById,
    updateVocabulary,
    deleteVocabulary,
    updateBulkImages,
    togglePublishVocabulary,
    importVocabularies
} from '../controllers/vocabularyController.js';

import { protect, admin } from '../middlewares/auth.js';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Bắt buộc đăng nhập cho toàn bộ các API thuộc module này
router.use(protect);

// Các API dành cho Học viên (Student) & Admin xem chung
router.get('/', getVocabularies);
router.get('/:id', getVocabularyById);

// Các API quản trị (Chỉ Admin)
router.post('/', admin, createVocabulary);
router.post('/import', admin, upload.single('file'), importVocabularies);
router.patch('/bulk-images', admin, updateBulkImages);
router.patch('/:id', admin, updateVocabulary);
router.patch('/:id/publish', admin, togglePublishVocabulary);
router.delete('/:id', admin, deleteVocabulary);

export default router;