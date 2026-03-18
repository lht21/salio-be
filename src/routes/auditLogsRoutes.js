import express from 'express'
import { getAuditLogs } from '../controllers/auditLogController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: Quản lý và xem lịch sử hoạt động hệ thống (Chỉ dành cho Admin)
 */

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Lấy danh sách nhật ký hoạt động của hệ thống
 *     description: Trả về danh sách các hành động đã thực hiện trong hệ thống (như đăng nhập, cập nhật dữ liệu, xóa...). Chỉ Admin mới có quyền truy cập.
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách nhật ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   user:
 *                     type: string
 *                     description: ID người dùng thực hiện hành động
 *                   action:
 *                     type: string
 *                     description: Hành động đã thực hiện
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Không có quyền truy cập (Chưa đăng nhập)
 *       403:
 *         description: Quyền truy cập bị từ chối (Không phải Admin)
 */
///admin
router.get('/', protect, admin, getAuditLogs)

export default router;