import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware kiểm tra token (xác thực người dùng đã đăng nhập)
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Lấy token từ header
            token = req.headers.authorization.split(' ')[1];

            // Xác thực token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('🔐 [Auth] Decoded token:', decoded);

            // Lấy thông tin user từ token và gán vào req
            req.user = await User.findById(decoded.id).select('-password');
            
            // QUAN TRỌNG: Gán userId để dùng ở các controller khác nếu cần
            req.userId = decoded.id;
            
            console.log('🔐 [Auth] Set req.userId to:', req.userId);
            console.log('🔐 [Auth] User found:', req.user ? req.user._id : 'NOT FOUND');
            
            if (!req.user) {
                return res.status(401).json({ msg: 'Người dùng không tồn tại' });
            }
            
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ msg: 'Không có quyền truy cập, token không hợp lệ' });
        }
    }

    if (!token) {
        return res.status(401).json({ msg: 'Không có quyền truy cập, không tìm thấy token' });
    }
};

// Middleware kiểm tra vai trò admin (phân quyền)
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ msg: 'Không có quyền truy cập, yêu cầu vai trò Admin' });
    }
};

// Middleware kiểm tra nhiều vai trò (Logic cốt lõi)
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ msg: 'Không có quyền truy cập, vui lòng đăng nhập' });
        }
        
        if (roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ 
                msg: `Không có quyền truy cập, yêu cầu vai trò: ${roles.join(' hoặc ')}`
            });
        }
    };
};

// --- CÁC MIDDLEWARE ĐƯỢC TẠO TỪ checkRole ---

// Cho phép Teacher hoặc Admin
const teacherOrAdmin = checkRole(['teacher', 'admin']);
const teacher = checkRole(['teacher']);

// --- EXPORT ---
export { protect, admin, checkRole, teacherOrAdmin, teacher };

// Alias (tên gọi khác) cho protect nếu cần dùng ở các file khác
export const auth = protect;
export const authenticateToken = protect;