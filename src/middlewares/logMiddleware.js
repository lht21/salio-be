import AuditLog from '../models/AuditLog.js';

const logActivity = async (req, res, next) => {
    // 1. Bỏ qua các request GET thông thường để tránh rác DB (Tùy nhu cầu)
    // Nếu bạn muốn log CẢ việc xem dữ liệu, hãy bỏ dòng if này.
    // Ở đây tôi chỉ log các hành động thay đổi dữ liệu (POST, PUT, PATCH, DELETE)
    if (req.method === 'GET') {
        return next();
    }

    // Lưu lại hàm send gốc để can thiệp sau khi response được gửi
    const originalSend = res.send;

    // Ghi đè hàm send để bắt được body response và status code khi kết thúc
    res.send = function (data) {
        // Khôi phục hàm send gốc để response vẫn được gửi đi bình thường
        originalSend.apply(res, arguments);

        // --- BẮT ĐẦU GHI LOG (CHẠY NGẦM) ---
        // Chúng ta không dùng await ở đây để không làm chậm response trả về cho user
        (async () => {
            try {
                // Lọc bỏ thông tin nhạy cảm trong body (như password)
                const sanitizedBody = { ...req.body };
                if (sanitizedBody.password) sanitizedBody.password = '***FILTERED***';
                if (sanitizedBody.newPassword) sanitizedBody.newPassword = '***FILTERED***';
                if (sanitizedBody.token) sanitizedBody.token = '***FILTERED***';

                // Xác định User (nếu đã đăng nhập qua middleware protect)
                const userId = req.user ? req.user._id : null;

                // Xác định Resource (Ví dụ: /api/users -> Users)
                const resource = req.baseUrl.split('/')[2] || 'Unknown'; 

                await AuditLog.create({
                    user: userId,
                    action: `${req.method} ${req.originalUrl}`,
                    method: req.method,
                    resource: resource,
                    statusCode: res.statusCode,
                    status: (res.statusCode >= 200 && res.statusCode < 400) ? 'Success' : 'Failed',
                    reqBody: sanitizedBody,
                    reqQuery: req.query,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent')
                });

            } catch (err) {
                console.error('Lỗi khi ghi Audit Log:', err.message);
                // Không làm gì cả để tránh ảnh hưởng luồng chính
            }
        })();
    };

    next();
};

export { logActivity };