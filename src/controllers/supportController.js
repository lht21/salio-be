import SupportTicket from '../models/SupportTicket.js';
import SupportTopic from '../models/SupportTopic.js';
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js';

// ======================================================================= //
// NHÓM API QUẢN LÝ TOPIC (HƯỚNG DẪN / FAQ)
// ======================================================================= //

/**
 * GET /api/v1/support/topics
 * Lấy danh sách Topic (Public/Student chỉ thấy isActive: true)
 */
export const getTopics = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        
        const query = { isActive: true };

        // Nếu là Admin/Teacher thì bỏ qua điều kiện isActive để quản lý
        if (req.user && ['admin', 'teacher'].includes(req.user.role)) {
            delete query.isActive;
        }

        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' };

        const topics = await SupportTopic.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('createdBy', 'username');

        const total = await SupportTopic.countDocuments(query);

        return ok(res, {
            topics,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy danh sách hướng dẫn thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách Topic: ' + error.message);
    }
};

/**
 * GET /api/v1/support/topics/:topicId
 * Xem chi tiết 1 bài hướng dẫn
 */
export const getTopicById = async (req, res) => {
    try {
        const topic = await SupportTopic.findById(req.params.topicId).populate('createdBy', 'username');
        if (!topic) return notFound(res, 'Không tìm thấy bài viết hướng dẫn');

        // Chặn Student xem bài đã bị ẩn
        const isAdmin = req.user && ['admin', 'teacher'].includes(req.user.role);
        if (!topic.isActive && !isAdmin) {
            return badRequest(res, 'Bài viết này đã bị ẩn hoặc không tồn tại');
        }

        return ok(res, topic, 'Lấy chi tiết bài hướng dẫn thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết Topic: ' + error.message);
    }
};

/**
 * POST /api/v1/support/topics
 * Tạo bài hướng dẫn (Chỉ Admin)
 */
export const createTopic = async (req, res) => {
    try {
        const { title, content, category, isActive } = req.body;
        if (!title || !content || !category) {
            return badRequest(res, 'Vui lòng cung cấp đầy đủ Tiêu đề, Nội dung và Danh mục');
        }

        const newTopic = await SupportTopic.create({
            title,
            content,
            category,
            isActive,
            createdBy: req.user._id
        });

        return created(res, newTopic, 'Tạo bài hướng dẫn mới thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi tạo Topic: ' + error.message);
    }
};

/**
 * PATCH /api/v1/support/topics/:topicId
 * Chỉnh sửa bài hướng dẫn (Chỉ Admin)
 */
export const updateTopic = async (req, res) => {
    try {
        const updatedTopic = await SupportTopic.findByIdAndUpdate(
            req.params.topicId,
            req.body,
            { returnDocument: 'after', runValidators: true }
        );

        if (!updatedTopic) return notFound(res, 'Không tìm thấy bài hướng dẫn để cập nhật');
        return ok(res, updatedTopic, 'Cập nhật bài hướng dẫn thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật Topic: ' + error.message);
    }
};

/**
 * DELETE /api/v1/support/topics/:topicId
 * Xóa bài hướng dẫn (Chỉ Admin)
 */
export const deleteTopic = async (req, res) => {
    try {
        const topic = await SupportTopic.findByIdAndDelete(req.params.topicId);
        if (!topic) return notFound(res, 'Không tìm thấy bài hướng dẫn để xóa');
        return ok(res, null, 'Xóa bài hướng dẫn thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa Topic: ' + error.message);
    }
};

// ======================================================================= //
// NHÓM API QUẢN LÝ TICKETS (YÊU CẦU HỖ TRỢ)
// ======================================================================= //

/**
 * POST /api/v1/support/tickets
 * Tạo Ticket mới (Student)
 */
export const createTicket = async (req, res) => {
    try {
        const { subject, description, category } = req.body;
        if (!subject || !description || !category) {
            return badRequest(res, 'Vui lòng cung cấp Tiêu đề, Mô tả và Phân loại');
        }

        const ticket = await SupportTicket.create({
            requester: req.user._id,
            subject,
            description,
            category,
            status: 'open',
            messages: [{
                sender: req.user._id,
                message: description
            }]
        });

        return created(res, ticket, 'Tạo yêu cầu hỗ trợ thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi tạo Ticket: ' + error.message);
    }
};

/**
 * GET /api/v1/support/tickets
 * Lấy danh sách Ticket (Student chỉ thấy của mình, Admin thấy toàn bộ)
 */
export const getTickets = async (req, res) => {
    try {
        const { status, category, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        
        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;

        // Filter theo quyền
        const isAdmin = ['admin', 'teacher'].includes(req.user.role);
        if (!isAdmin) {
            query.requester = req.user._id;
        }

        const tickets = await SupportTicket.find(query)
            .populate('requester', 'username email')
            .populate('assignee', 'username')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await SupportTicket.countDocuments(query);

        return ok(res, {
            tickets,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy danh sách Ticket thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách Ticket: ' + error.message);
    }
};

/**
 * GET /api/v1/support/tickets/:ticketId
 * Lấy chi tiết Ticket + Tự động ẩn Note nội bộ với Student
 */
export const getTicketById = async (req, res) => {
    try {
        const ticket = await SupportTicket.findById(req.params.ticketId)
            .populate('requester', 'username email avatarUrl')
            .populate('assignee', 'username email')
            .populate('messages.sender', 'username avatarUrl role');

        if (!ticket) return notFound(res, 'Không tìm thấy yêu cầu hỗ trợ');

        const isAdmin = ['admin', 'teacher'].includes(req.user.role);
        
        // Chặn Student xem ticket của người khác
        if (!isAdmin && ticket.requester._id.toString() !== req.user._id.toString()) {
            return badRequest(res, 'Bạn không có quyền xem Ticket này');
        }

        // Convert sang object thuần để xử lý filter an toàn
        const ticketObj = ticket.toObject();

        // LỌC BỎ TIN NHẮN NỘI BỘ NẾU LÀ STUDENT
        if (!isAdmin) {
            ticketObj.messages = ticketObj.messages.filter(msg => !msg.isInternal);
        }

        return ok(res, ticketObj, 'Lấy chi tiết Ticket thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết Ticket: ' + error.message);
    }
};

/**
 * POST /api/v1/support/tickets/:ticketId/messages
 * Gửi tin nhắn vào Ticket
 */
export const addMessage = async (req, res) => {
    try {
        const { message, isInternal } = req.body;
        if (!message) return badRequest(res, 'Nội dung tin nhắn không được để trống');

        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket) return notFound(res, 'Không tìm thấy Ticket');

        const isAdmin = ['admin', 'teacher'].includes(req.user.role);
        if (!isAdmin && ticket.requester.toString() !== req.user._id.toString()) {
            return badRequest(res, 'Bạn không có quyền gửi tin nhắn vào Ticket này');
        }

        // Đảm bảo chỉ Admin mới có quyền tạo tin nhắn internal
        const internalFlag = isAdmin ? (isInternal === true) : false;

        ticket.messages.push({
            sender: req.user._id,
            message,
            isInternal: internalFlag
        });

        // Auto-change status để dễ Tracking
        if (isAdmin && !internalFlag && ticket.status !== 'resolved' && ticket.status !== 'closed') {
            ticket.status = 'pending_user'; // Chờ user phản hồi
        } else if (!isAdmin && ticket.status !== 'closed') {
            ticket.status = 'open'; // User mới reply -> Open lại để admin xử lý
        }

        await ticket.save();
        
        // Load lại message vừa thêm cùng thông tin User để trả thẳng về giao diện
        const updatedTicket = await SupportTicket.findById(ticket._id)
            .populate('messages.sender', 'username avatarUrl role');
        const newMessage = updatedTicket.messages[updatedTicket.messages.length - 1];

        return ok(res, newMessage, 'Gửi tin nhắn thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi gửi tin nhắn: ' + error.message);
    }
};

/**
 * PATCH /api/v1/support/tickets/:ticketId/status
 * Đổi trạng thái Ticket (Admin)
 */
export const updateTicketStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['open', 'pending_user', 'in_progress', 'resolved', 'closed'];
        
        if (!validStatuses.includes(status)) {
            return badRequest(res, 'Trạng thái không hợp lệ');
        }

        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket) return notFound(res, 'Không tìm thấy Ticket');

        ticket.status = status;
        if (status === 'resolved') ticket.resolvedAt = new Date();
        if (status === 'closed') ticket.closedAt = new Date();

        await ticket.save();
        return ok(res, ticket, `Đã cập nhật trạng thái thành: ${status}`);
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật trạng thái Ticket: ' + error.message);
    }
};

/**
 * PATCH /api/v1/support/tickets/:ticketId/assign
 * Phân công Ticket cho nhân viên (Admin)
 */
export const assignTicket = async (req, res) => {
    try {
        const { assigneeId } = req.body;
        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket) return notFound(res, 'Không tìm thấy Ticket');

        ticket.assignee = assigneeId || undefined;
        
        // Đổi trạng thái sang in_progress nếu mới được giao việc
        if (assigneeId && ticket.status === 'open') {
            ticket.status = 'in_progress';
        }

        await ticket.save();
        return ok(res, ticket, 'Phân công xử lý Ticket thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi phân công Ticket: ' + error.message);
    }
};