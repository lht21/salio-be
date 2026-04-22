import { verifyAccessToken } from '../utils/jwt.js';
import { unauthorized, forbidden } from '../utils/response.js';
import User from '../models/User.js';

// ─── Authenticate ─────────────────────────────────────────────────────────────

/**
 * Verifies the Bearer access token in the Authorization header.
 * Attaches the full user document to req.user.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Token xác thực không được cung cấp');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select(
      '+refreshToken'
    );

    if (!user) {
      return unauthorized(res, 'Tài khoản không tồn tại');
    }

    if (!user.isActive) {
      return forbidden(res, 'Tài khoản đã bị vô hiệu hóa');
    }

    if (user.isBanned) {
      return forbidden(res, 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token đã hết hạn. Vui lòng đăng nhập lại');
    }
    if (err.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Token không hợp lệ');
    }
    return unauthorized(res, 'Xác thực thất bại');
  }
};

// ─── Optional authenticate (doesn't fail if no token) ────────────────────────

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId);
    req.user = user || null;
  } catch {
    req.user = null;
  }
  next();
};

// ─── Authorize Roles ──────────────────────────────────────────────────────────

/**
 * Authorizes users based on their role.
 * User must be an admin.
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return forbidden(res, 'Yêu cầu quyền Admin');
  }
};

/**
 * Authorizes users based on their role.
 * User must be a teacher or an admin.
 */
const teacher = (req, res, next) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    next();
  } else {
    return forbidden(res, 'Yêu cầu quyền Giáo viên hoặc Admin');
  }
};

export { protect, optionalAuthenticate, admin, teacher };