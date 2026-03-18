import SupportTicket from "../models/SupportTicket.js";


///ADM009
///tạo ticket danh cho user
const createTicket = async (req, res) => {
    const { subject, category, description, priority } = req.body;
    try {
        const ticket = new SupportTicket({
            requester: req.user._id,
            subject,
            description,
            category,
            priority: priority || 'medium',
        });
        await ticket.save();
        res.status(201).json(ticket);
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server.' });
    }
};

///LẤY DANH SÁCH CẦN HỖ TRỢ
const getTickets = async (req, res) => {
    try {
        const { status, priority, category, assignee, search, pageNumber} = req.query;

        const pageSize = 10;
        const page = Number(pageNumber) || 1;

        const filter = {};

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (category) filter.category = category;
        if (assignee === 'me') filter.assignee = req.user._id;

        if (search) {
             /// tìm theo tiêu đề
             filter.subject = { $regex: search, $options: 'i' };
        }

        const count = await SupportTicket.countDocuments(filter);


        const tickets = await SupportTicket.find(filter)
            .populate('requester', 'name email avatar')
            .populate('assignee', 'name')
            .sort({ updatedAt: -1, priority: -1 }) // Ưu tiên cái mới nhất hoặc khẩn cấp nhất
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ tickets, page, pages: Math.ceil(count / pageSize), total: count });
        
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server.', error: error.message });
    }
    
}

///chi tiết ticket
const getTicketById = async (req, res) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id)
            .populate('requester', 'fullName email avatar subscription')
            .populate('assignee', 'fullName email')
            .populate('messages.sender', 'name role avatar'); // Populate người chat
            
        if (!ticket) return res.status(404).json({ msg: 'Không tìm thấy yêu cầu.' });
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server.' });
    }
};


/// cập nhật ticket như gán người trao đổi, đổi trạng thái khi xử lý xong, đổi độ ưu tiên
const updateTicket = async (req, res) => {
    try {
        const { status, priority, assigneeId } = req.body;
        const ticket = await SupportTicket.findById(req.params.id);

        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });

        if (status) {
            ticket.status = status;
            if (status === 'resolved' && !ticket.resolvedAt) {
                ticket.resolvedAt = Date.now();
            }
            if (status === 'closed' && !ticket.closedAt) {
                ticket.closedAt = Date.now();
            }
        }
        if (priority) ticket.priority = priority;
        
        // Gán người xử lý
        if (assigneeId) {
            ticket.assignee = assigneeId;
        }

        await ticket.save();
        
        // Populate lại để trả về frontend update ngay lập tức
        const updatedTicket = await SupportTicket.findById(req.params.id)
            .populate('requester', 'username')
            .populate('assignee', 'username');

        res.json(updatedTicket);
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server.' });
    }
};


///trao đổi với khách hàng về sự cố
const replyTicket = async (req, res) => {
    try {
        const { message, isInternal } = req.body;
        const ticket = await SupportTicket.findById(req.params.id);

        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });

        // Thêm tin nhắn mới
        ticket.messages.push({
            sender: req.user._id,
            message,
            isInternal: isInternal || false
        });

        // Tự động cập nhật trạng thái nếu chưa đóng
        if (ticket.status === 'open' && !isInternal) {
            ticket.status = 'in_progress';
        }

        await ticket.save();
        
        // Trả về danh sách messages mới nhất
        const updatedTicket = await SupportTicket.findById(req.params.id)
            .populate('messages.sender', 'username role avatar');

        res.json(updatedTicket.messages);
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server.' });
    }
};

export {
    createTicket,
    getTicketById,
    getTickets,
    replyTicket,
    updateTicket,

}