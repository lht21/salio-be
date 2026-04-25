import express from 'express';
import { uploadFile } from '../controllers/uploadController.js';
import { uploadAudio, uploadImage } from '../middlewares/upload.js';
import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

// --- BẢO MẬT: CHỈ USER ĐÃ ĐĂNG NHẬP MỚI ĐƯỢC UPLOAD ---
router.use(protect);

// Cấp quyền cho Admin/Teacher tải lên file audio (mp3, wav...)
router.post('/audio', admin, uploadAudio.single('file'), uploadFile);

// Có thể tận dụng luôn làm API tải ảnh cho đề Viết (Reading/Writing)
router.post('/image', admin, uploadImage.single('file'), uploadFile);

export default router;