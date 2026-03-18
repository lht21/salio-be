import AuditLog from '../models/AuditLog.js';

const getAuditLogs = async (req, res) => {
    const pageSize = 20; // Số lượng log mỗi trang
    const page = Number(req.query.pageNumber) || 1;

    // Xây dựng bộ lọc
    const filter = {};
    
    // Lọc theo Method (GET, POST...)
    if (req.query.method) {
        filter.method = req.query.method;
    }
    
    // Lọc theo Status (Success, Failed)
    if (req.query.status) {
        filter.status = req.query.status;
    }

    // Tìm kiếm (User Email hoặc Action)
    if (req.query.search) {
        // Lưu ý: Vì user là ObjectId (ref), việc search text trong User cần dùng $lookup (aggregate) phức tạp.
        // Để đơn giản hóa: Search theo Action hoặc IP trước.
        filter.$or = [
            { action: { $regex: req.query.search, $options: 'i' } },
            { ipAddress: { $regex: req.query.search, $options: 'i' } }
        ];
    }

    try {
        const count = await AuditLog.countDocuments(filter);
        
        // Query DB
        const logs = await AuditLog.find(filter)
            .populate('user', 'username email role') // Lấy thêm info User để hiển thị tên
            .sort({ performedAt: -1 }) // Mới nhất lên đầu
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            logs,
            page,
            pages: Math.ceil(count / pageSize),
            total: count
        });
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server khi lấy nhật ký hệ thống.', error: error.message });
    }
};

export { getAuditLogs}