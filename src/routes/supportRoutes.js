import express from 'express';
import {
    getTopics,
    getTopicById,
    createTopic,
    updateTopic,
    deleteTopic,
    createTicket,
    getTickets,
    getTicketById,
    addMessage,
    updateTicketStatus,
    assignTicket
} from '../controllers/supportController.js';
import { protect, admin } from '../middlewares/auth.js';

const router = express.Router();

// ======================================================================= //
// NHÓM API QUẢN LÝ TOPIC (HƯỚNG DẪN / FAQ)
// ======================================================================= //
/**
 * @swagger
 * /api/v1/support/topics:
 *   get:
 *     summary: Lấy danh sách topic hỗ trợ/FAQ
 *     description: Public có thể xem topic đang active. Nếu có token admin/teacher thì controller có thể trả cả topic inactive.
 *     tags: [Support]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [general, payment, technical, account, other]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Trả về topics, total, page, pages
 */
router.get('/topics', getTopics);

/**
 * @swagger
 * /api/v1/support/topics:
 *   post:
 *     summary: Tạo topic hỗ trợ/FAQ
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, category]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Cách đổi mật khẩu
 *               content:
 *                 type: string
 *                 description: Nội dung HTML hoặc Markdown
 *                 example: "Vào Hồ sơ > Bảo mật > Đổi mật khẩu."
 *               category:
 *                 type: string
 *                 enum: [general, payment, technical, account, other]
 *                 example: account
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Tạo topic thành công
 *       400:
 *         description: Thiếu title, content hoặc category
 *       403:
 *         description: Không phải admin
 */
router.post('/topics', protect, admin, createTopic);

/**
 * @swagger
 * /api/v1/support/topics/{topicId}:
 *   get:
 *     summary: Lấy chi tiết topic hỗ trợ/FAQ
 *     tags: [Support]
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về chi tiết topic
 *       400:
 *         description: Topic đã ẩn hoặc không tồn tại với student/public
 *       404:
 *         description: Không tìm thấy topic
 */
router.get('/topics/:topicId', getTopicById);

/**
 * @swagger
 * /api/v1/support/topics/{topicId}:
 *   patch:
 *     summary: Cập nhật topic hỗ trợ/FAQ
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
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
 *           example:
 *             title: Cách đổi mật khẩu tài khoản
 *             isActive: true
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không phải admin
 *       404:
 *         description: Không tìm thấy topic
 */
router.patch('/topics/:topicId', protect, admin, updateTopic);

/**
 * @swagger
 * /api/v1/support/topics/{topicId}:
 *   delete:
 *     summary: Xóa topic hỗ trợ/FAQ
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không phải admin
 *       404:
 *         description: Không tìm thấy topic
 */
router.delete('/topics/:topicId', protect, admin, deleteTopic);

// ======================================================================= //
// NHÓM API QUẢN LÝ TICKETS (YÊU CẦU HỖ TRỢ)
// ======================================================================= //
// Áp dụng middleware protect cho toàn bộ các route liên quan đến ticket
router.use('/tickets', protect);

/**
 * @swagger
 * /api/v1/support/tickets:
 *   get:
 *     summary: Lấy danh sách ticket hỗ trợ
 *     description: Student chỉ thấy ticket của mình; admin/teacher thấy toàn bộ. Hỗ trợ lọc status/category và phân trang.
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, pending_user, in_progress, resolved, closed]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [account, payment, technical, content, other]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Trả về tickets, total, page, pages
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/tickets', getTickets);

/**
 * @swagger
 * /api/v1/support/tickets:
 *   post:
 *     summary: Tạo ticket hỗ trợ mới
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, description, category]
 *             properties:
 *               subject:
 *                 type: string
 *                 example: Không truy cập được bài học
 *               description:
 *                 type: string
 *                 example: Tôi đã thanh toán nhưng bài học vẫn bị khóa.
 *               category:
 *                 type: string
 *                 enum: [account, payment, technical, content, other]
 *                 example: payment
 *     responses:
 *       201:
 *         description: Tạo ticket thành công
 *       400:
 *         description: Thiếu subject, description hoặc category
 */
router.post('/tickets', createTicket);

/**
 * @swagger
 * /api/v1/support/tickets/{ticketId}:
 *   get:
 *     summary: Lấy chi tiết ticket hỗ trợ
 *     description: Student chỉ xem ticket của mình và không thấy message nội bộ; admin/teacher thấy đầy đủ.
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về chi tiết ticket
 *       400:
 *         description: Không có quyền xem ticket
 *       404:
 *         description: Không tìm thấy ticket
 */
router.get('/tickets/:ticketId', getTicketById);

/**
 * @swagger
 * /api/v1/support/tickets/{ticketId}/messages:
 *   post:
 *     summary: Gửi tin nhắn vào ticket
 *     description: Student gửi reply thường; admin/teacher có thể gửi message nội bộ bằng isInternal=true.
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: Mình gửi thêm ảnh lỗi ở màn hình thanh toán.
 *               isInternal:
 *                 type: boolean
 *                 description: Chỉ admin/teacher có hiệu lực
 *                 example: false
 *     responses:
 *       200:
 *         description: Gửi tin nhắn thành công
 *       400:
 *         description: Thiếu message hoặc không có quyền gửi
 *       404:
 *         description: Không tìm thấy ticket
 */
router.post('/tickets/:ticketId/messages', addMessage);

// Chỉ Admin mới được quyền đổi trạng thái và gán ticket
/**
 * @swagger
 * /api/v1/support/tickets/{ticketId}/status:
 *   patch:
 *     summary: Cập nhật trạng thái ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, pending_user, in_progress, resolved, closed]
 *                 example: in_progress
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       400:
 *         description: Status không hợp lệ
 *       403:
 *         description: Không phải admin
 *       404:
 *         description: Không tìm thấy ticket
 */
router.patch('/tickets/:ticketId/status', admin, updateTicketStatus);

/**
 * @swagger
 * /api/v1/support/tickets/{ticketId}/assign:
 *   patch:
 *     summary: Gán ticket cho nhân viên/admin
 *     description: Truyền assigneeId để gán; truyền null hoặc bỏ trống để bỏ gán. Nếu ticket đang open và được gán, status chuyển thành in_progress.
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
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
 *               assigneeId:
 *                 type: string
 *                 nullable: true
 *                 example: 69eae3c21d129fee20c29386
 *     responses:
 *       200:
 *         description: Phân công thành công
 *       403:
 *         description: Không phải admin
 *       404:
 *         description: Không tìm thấy ticket
 */
router.patch('/tickets/:ticketId/assign', admin, assignTicket);

export default router;
