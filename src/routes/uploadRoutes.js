import express from 'express';
import { uploadFile } from '../controllers/uploadController.js';
import { uploadAudio, uploadImage } from '../middlewares/upload.js';
import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/v1/upload/audio:
 *   post:
 *     summary: Upload file audio lên S3
 *     description: Chỉ user role admin được upload. Field form-data phải là file.
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: mp3, wav, ogg, m4a hoặc mpeg; tối đa 30MB
 *     responses:
 *       200:
 *         description: Trả về data.fileUrl để gắn vào audioUrl hoặc referenceAudioUrl khi tạo item trong question bank
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Tải file lên thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     fileUrl:
 *                       type: string
 *                       example: https://salio-storage-assets.s3.ap-southeast-1.amazonaws.com/audio/example.mp3
 *       400:
 *         description: File không hợp lệ hoặc thiếu file
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */
router.post('/audio', admin, uploadAudio.single('file'), uploadFile);

/**
 * @swagger
 * /api/v1/upload/image:
 *   post:
 *     summary: Upload file ảnh lên S3
 *     description: Chỉ user role admin được upload. Field form-data phải là file.
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: jpeg, jpg, png, gif hoặc webp; tối đa 10MB
 *     responses:
 *       200:
 *         description: Trả về data.fileUrl để gắn vào attachedImage khi tạo item writing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Tải file lên thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     fileUrl:
 *                       type: string
 *                       example: https://salio-storage-assets.s3.ap-southeast-1.amazonaws.com/images/example.png
 *       400:
 *         description: File không hợp lệ hoặc thiếu file
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */
router.post('/image', admin, uploadImage.single('file'), uploadFile);

export default router;
