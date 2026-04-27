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
router.route('/topics')
    .get(getTopics) // Public: Ai cũng có thể xem danh sách bài hướng dẫn
    .post(protect, admin, createTopic); // Chỉ Admin mới được tạo

router.route('/topics/:topicId')
    .get(getTopicById)
    .patch(protect, admin, updateTopic)
    .delete(protect, admin, deleteTopic);

// ======================================================================= //
// NHÓM API QUẢN LÝ TICKETS (YÊU CẦU HỖ TRỢ)
// ======================================================================= //
// Áp dụng middleware protect cho toàn bộ các route liên quan đến ticket
router.use('/tickets', protect);

router.route('/tickets')
    .get(getTickets)
    .post(createTicket);

router.route('/tickets/:ticketId')
    .get(getTicketById);

router.post('/tickets/:ticketId/messages', addMessage);

// Chỉ Admin mới được quyền đổi trạng thái và gán ticket
router.patch('/tickets/:ticketId/status', admin, updateTicketStatus);
router.patch('/tickets/:ticketId/assign', admin, assignTicket);

export default router;