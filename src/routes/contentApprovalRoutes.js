import express from 'express'
import { getContentList, getContentDetail, approveOrRejectContent } from '../controllers/contentApprovalController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Content Approval
 *   description: Quản lý phê duyệt nội dung bài học, tin tức (Chỉ dành cho Admin)
 */

// --- ADMIN ROUTES ---

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Lấy danh sách tất cả nội dung đang chờ phê duyệt
 *     tags: [Content Approval]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách nội dung cần duyệt
 *       403:
 *         description: Không có quyền Admin
 */
router.get('/', protect, admin, getContentList)

/**
 * @swagger
 * /api/content/{id}:
 *   patch:
 *     summary: Phê duyệt hoặc từ chối một nội dung
 *     description: Cập nhật trạng thái của nội dung (thường là 'approved' hoặc 'rejected').
 *     tags: [Content Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của nội dung cần xử lý
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 example: approved
 *               reason:
 *                 type: string
 *                 description: Lý do (đặc biệt nếu từ chối)
 *                 example: "Nội dung không phù hợp tiêu chuẩn"
 *     responses:
 *       200:
 *         description: Đã cập nhật trạng thái nội dung thành công
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 */
router.patch('/:id', protect, admin, approveOrRejectContent)

/**
 * @swagger
 * /api/content/{id}/preview:
 *   get:
 *     summary: Xem chi tiết nội dung trước khi phê duyệt (Preview)
 *     tags: [Content Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của nội dung cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết nội dung để Admin kiểm tra
 *       404:
 *         description: Không tìm thấy nội dung
 */
router.get('/:id/preview', protect, admin, getContentDetail)

export default router;