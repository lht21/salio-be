import User from "../models/User.js";
import UserProgress from "../models/UserProgress.js";
import Vocabulary from "../models/Vocabulary.js";
import LessonProgress from "../models/LessonProgress.js";
import { badRequest, conflict, ok, serverError, notFound } from "../utils/response.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../middlewares/upload.js";

// ─── GET /api/v1/users/me ─────────────────────────────────────────────────────

/**
 * Lấy thông tin tài khoản đang đăng nhập
 * Yêu cầu: Đã đăng nhập (Student, Admin)
 */
const getMe = async (req, res) => {
  try {
    // req.user thường được đính kèm từ authenticate middleware
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return notFound(res, 'Không tìm thấy thông tin người dùng');
    }

    return ok(res, user.toPublicJSON(), 'Lấy thông tin tài khoản thành công');
  } catch (err) {
    console.error('[getMe]', err);
    return serverError(res, 'Lấy thông tin tài khoản thất bại');
  }
};

// ─── PATCH /api/v1/users/me ───────────────────────────────────────────────────

/**
 * Cập nhật thông tin cá nhân cơ bản
 * Yêu cầu: Đã đăng nhập (Student, Admin)
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return notFound(res, 'Không tìm thấy thông tin người dùng');
    }

    // Nếu cập nhật username, cần kiểm tra trùng lặp
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return conflict(res, 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác');
      }
      user.username = username;
    }

    await user.save();

    return ok(res, user.toPublicJSON(), 'Cập nhật thông tin cá nhân thành công');
  } catch (err) {
    console.error('[updateProfile]', err);
    return serverError(res, 'Cập nhật thông tin cá nhân thất bại');
  }
};

// ─── POST /api/v1/users/me/avatar ─────────────────────────────────────────────

/**
 * Cập nhật avatar
 * Yêu cầu: Đã đăng nhập (Student, Admin)
 */
const updateAvatar = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return notFound(res, 'Không tìm thấy thông tin người dùng');
    }

    // Middleware `upload.single('avatar')` đã xử lý việc upload file lên S3.
    // Thông tin file trên S3 sẽ nằm trong `req.file`.
    if (!req.file) {
      return badRequest(res, 'Vui lòng cung cấp file ảnh hợp lệ');
    }

    // Dọn dẹp ảnh cũ trên S3 trước khi lưu ảnh mới để tiết kiệm dung lượng
    if (user.avatarUrl) {
      try {
        const parsedUrl = new URL(user.avatarUrl);
        const key = decodeURIComponent(parsedUrl.pathname.substring(1));
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key
        }));
      } catch (s3Err) {
        console.error('Lỗi khi xóa avatar cũ trên S3:', s3Err);
      }
    }

    // `req.file.location` là URL công khai của file trên S3 do multer-s3 cung cấp
    user.avatarUrl = req.file.location;
    await user.save();

    return ok(res, { avatarUrl: user.avatarUrl }, 'Cập nhật ảnh đại diện thành công');
  } catch (err) {
    console.error('[updateAvatar]', err);
    return serverError(res, 'Cập nhật ảnh đại diện thất bại');
  }
};

// ─── PATCH /api/v1/users/me/password ──────────────────────────────────────────

/**
 * Đổi mật khẩu
 * Yêu cầu: Đã đăng nhập (Student, Admin)
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    // Phải explicitly select password để so sánh vì schema để select: false
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return notFound(res, 'Không tìm thấy thông tin người dùng');
    }

    // So sánh mật khẩu hiện tại
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return badRequest(res, 'Mật khẩu hiện tại không đúng');
    }

    // Cập nhật mật khẩu mới (hook pre-save trong model sẽ tự động băm)
    user.password = newPassword;
    await user.save();

    return ok(res, null, 'Đổi mật khẩu thành công');
  } catch (err) {
    console.error('[changePassword]', err);
    return serverError(res, 'Đổi mật khẩu thất bại');
  }
};

// ─── PATCH /api/v1/users/me/preferences ───────────────────────────────────────

/**
 * Cập nhật tùy chọn ứng dụng (theme, ngôn ngữ, giọng đọc,...)
 * Yêu cầu: Đã đăng nhập (Student)
 */
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    // Lấy các field thuộc preferences khớp với User Schema
    const { theme, language, notifications, voiceGender } = req.body.preferences || req.body;

    const user = await User.findById(userId);
    if (!user) {
      return notFound(res, 'Không tìm thấy thông tin người dùng');
    }

    // Khởi tạo preferences nếu chưa có
    if (!user.preferences) user.preferences = {};

    if (theme !== undefined) user.preferences.theme = theme;
    if (language !== undefined) user.preferences.language = language;
    if (voiceGender !== undefined) user.preferences.voiceGender = voiceGender;

    if (notifications !== undefined) {
      if (!user.preferences.notifications) user.preferences.notifications = {};
      if (notifications.enabled !== undefined) user.preferences.notifications.enabled = notifications.enabled;
      if (notifications.dailyReminderTime !== undefined) user.preferences.notifications.dailyReminderTime = notifications.dailyReminderTime;
    }

    await user.save();

    return ok(res, { preferences: user.preferences }, 'Cập nhật tùy chọn thành công');
  } catch (err) {
    console.error('[updatePreferences]', err);
    return serverError(res, 'Cập nhật tùy chọn thất bại');
  }
};

// ─── GET /api/v1/users/me/stats ───────────────────────────────────────────────

/**
 * Lấy thống kê học tập cá nhân
 * Yêu cầu: Đã đăng nhập (Student)
 */
const getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const progress = await UserProgress.findOne({ user: userId });
    if (!progress) {
      return notFound(res, 'Không tìm thấy dữ liệu học tập');
    }

    return ok(res, {
      gamification: progress.gamification,
      statistics: progress.statistics,
      savedVocabulariesCount: progress.statistics?.savedVocabularies?.length || 0,
      completedLessonsCount: progress.statistics?.completedLessons?.length || 0
    }, 'Lấy thống kê học tập thành công');
  } catch (err) {
    console.error('[getMyStats]', err);
    return serverError(res, 'Lấy thống kê học tập thất bại');
  }
};

// ─── GET /api/v1/users ────────────────────────────────────────────────────────

/**
 * Lấy danh sách người dùng
 * Yêu cầu: Đã đăng nhập (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, isBanned } = req.query;
    const query = {};

    if (role) query.role = role;
    if (isBanned !== undefined) query.isBanned = isBanned === 'true';
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    return ok(res, {
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    }, 'Lấy danh sách người dùng thành công');
  } catch (err) {
    console.error('[getAllUsers]', err);
    return serverError(res, 'Lấy danh sách người dùng thất bại');
  }
};

// ─── GET /api/v1/users/:userId ────────────────────────────────────────────────

/**
 * Xem chi tiết một người dùng
 * Yêu cầu: Đã đăng nhập (Admin)
 */
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return notFound(res, 'Không tìm thấy người dùng');
    }

    return ok(res, user, 'Lấy chi tiết người dùng thành công');
  } catch (err) {
    console.error('[getUserDetails]', err);
    return serverError(res, 'Lấy chi tiết người dùng thất bại');
  }
};

// ─── PATCH /api/v1/users/:userId ──────────────────────────────────────────────

/**
 * Cập nhật tài khoản người dùng
 * Yêu cầu: Đã đăng nhập (Admin)
 */
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, level, role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return notFound(res, 'Không tìm thấy người dùng');
    }

    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return conflict(res, 'Tên đăng nhập đã tồn tại');
      }
      user.username = username;
    }

    if (level !== undefined) user.level = level;
    if (role !== undefined) user.role = role;

    await user.save();

    return ok(res, user, 'Cập nhật tài khoản thành công');
  } catch (err) {
    console.error('[updateUser]', err);
    return serverError(res, 'Cập nhật tài khoản thất bại');
  }
};

// ─── PATCH /api/v1/users/:userId/status ───────────────────────────────────────

/**
 * Khóa/mở tài khoản
 * Yêu cầu: Đã đăng nhập (Admin)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, isBanned } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return notFound(res, 'Không tìm thấy người dùng');
    }

    if (isActive !== undefined) user.isActive = isActive;
    if (isBanned !== undefined) user.isBanned = isBanned;

    await user.save();

    return ok(res, {
      isActive: user.isActive,
      isBanned: user.isBanned
    }, 'Cập nhật trạng thái tài khoản thành công');
  } catch (err) {
    console.error('[updateUserStatus]', err);
    return serverError(res, 'Cập nhật trạng thái thất bại');
  }
};

// ─── DELETE /api/v1/users/:userId ─────────────────────────────────────────────

/**
 * Xóa hoặc vô hiệu hóa tài khoản
 * Yêu cầu: Đã đăng nhập (Admin)
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Thực hiện xóa cứng user và dữ liệu progress liên quan
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return notFound(res, 'Không tìm thấy người dùng');
    }

    // Dọn dẹp avatar trên S3 Bucket (nếu có)
    if (user.avatarUrl) {
      try {
        const parsedUrl = new URL(user.avatarUrl);
        // Lấy key S3 từ URL (bỏ dấu '/' ở đầu)
        const key = decodeURIComponent(parsedUrl.pathname.substring(1));
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key
        }));
      } catch (s3Err) {
        console.error('Lỗi khi xóa avatar trên S3:', s3Err);
      }
    }

    await UserProgress.findOneAndDelete({ user: userId });

    return ok(res, null, 'Xóa tài khoản thành công');
  } catch (err) {
    console.error('[deleteUser]', err);
    return serverError(res, 'Xóa tài khoản thất bại');
  }
};

// ─── GET /api/v1/users/:userId/progress ───────────────────────────────────────

/**
 * Xem tiến độ học của học sinh
 * Yêu cầu: Đã đăng nhập (Admin)
 */
const getUserProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const progress = await UserProgress.findOne({ user: userId })
      .populate('statistics.savedVocabularies', 'word meaning')
      .populate('statistics.completedLessons');
      
    if (!progress) {
      return notFound(res, 'Không tìm thấy tiến độ học tập của người dùng này');
    }

    return ok(res, progress, 'Lấy tiến độ học tập thành công');
  } catch (err) {
    console.error('[getUserProgress]', err);
    return serverError(res, 'Lấy tiến độ học tập thất bại');
  }
};

// ─── GET /api/v1/users/:userId/subscription ───────────────────────────────────

/**
 * Xem gói cước của học sinh
 * Yêu cầu: Đã đăng nhập (Admin)
 */
const getUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('subscription');
    if (!user) {
      return notFound(res, 'Không tìm thấy người dùng');
    }

    return ok(res, user.subscription, 'Lấy thông tin gói cước thành công');
  } catch (err) {
    console.error('[getUserSubscription]', err);
    return serverError(res, 'Lấy thông tin gói cước thất bại');
  }
};

export { 
  getMe, 
  updateProfile, 
  updateAvatar, 
  changePassword, 
  updatePreferences, 
  getMyStats, 
  getAllUsers, 
  getUserDetails, 
  updateUser, 
  updateUserStatus, 
  deleteUser, 
  getUserProgress, 
  getUserSubscription 
};