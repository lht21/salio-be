import { body, validationResult } from 'express-validator';
import { badRequest } from '../utils/response.js';

// ─── Run validation and return errors ────────────────────────────────────────

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return badRequest(res, 'Dữ liệu không hợp lệ', formatted);
  }
  next();
};

// ─── Rule Sets ────────────────────────────────────────────────────────────────

const sendOtpRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email là bắt buộc')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  validate,
];

const verifyOtpRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email là bắt buộc')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('code')
    .trim()
    .notEmpty().withMessage('Mã OTP là bắt buộc')
    .isLength({ min: 6, max: 6 }).withMessage('Mã OTP phải đúng 6 ký tự')
    .isNumeric().withMessage('Mã OTP chỉ gồm chữ số'),
  validate,
];

const registerRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email là bắt buộc')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('username')
    .trim()
    .notEmpty().withMessage('Tên đăng nhập là bắt buộc')
    .isLength({ min: 3, max: 30 }).withMessage('Tên đăng nhập từ 3–30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Tên đăng nhập chỉ gồm chữ cái, số và dấu gạch dưới'),
  body('password')
    .notEmpty().withMessage('Mật khẩu là bắt buộc')
    .isLength({ min: 8 }).withMessage('Mật khẩu tối thiểu 8 ký tự')
    .matches(/[A-Z]/).withMessage('Mật khẩu phải có ít nhất 1 chữ hoa')
    .matches(/[0-9]/).withMessage('Mật khẩu phải có ít nhất 1 chữ số'),
  body('confirmPassword')
    .notEmpty().withMessage('Vui lòng nhập lại mật khẩu')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Mật khẩu xác nhận không khớp');
      return true;
    }),
  validate,
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email là bắt buộc')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Mật khẩu là bắt buộc'),
  validate,
];

const socialLoginRules = [
  body('provider')
    .notEmpty().withMessage('Provider là bắt buộc')
    .isIn(['google', 'apple']).withMessage('Provider phải là google hoặc apple'),
  body('idToken')
    .notEmpty().withMessage('idToken là bắt buộc'),
  validate,
];

const updateProfileRules = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Tên đăng nhập từ 3–30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Tên đăng nhập chỉ gồm chữ cái, số và dấu gạch dưới'),
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark']).withMessage('Giao diện phải là light hoặc dark'),
  body('preferences.voiceGender')
    .optional()
    .isIn(['male', 'female']).withMessage('Giọng đọc phải là male hoặc female'),
  body('preferences.notificationsEnabled')
    .optional()
    .isBoolean().withMessage('Thông báo phải là true/false'),
  body('preferences.dailyGoalMinutes')
    .optional()
    .isInt({ min: 5, max: 120 }).withMessage('Mục tiêu hàng ngày từ 5–120 phút'),
  validate,
];



const changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),
  body('newPassword')
    .notEmpty().withMessage('Mật khẩu mới là bắt buộc')
    .isLength({ min: 8 }).withMessage('Mật khẩu tối thiểu 8 ký tự')
    .matches(/[A-Z]/).withMessage('Mật khẩu phải có ít nhất 1 chữ hoa')
    .matches(/[0-9]/).withMessage('Mật khẩu phải có ít nhất 1 chữ số')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword)
        throw new Error('Mật khẩu mới không được trùng mật khẩu cũ');
      return true;
    }),
  body('confirmNewPassword')
    .notEmpty().withMessage('Vui lòng nhập lại mật khẩu mới')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword)
        throw new Error('Mật khẩu xác nhận không khớp');
      return true;
    }),
  validate,
];

const forgotPasswordRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email là bắt buộc')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  validate,
];

const resetPasswordRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email là bắt buộc')
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),
  body('code')
    .trim()
    .notEmpty().withMessage('Mã OTP là bắt buộc')
    .isLength({ min: 6, max: 6 }).withMessage('Mã OTP phải đúng 6 ký tự')
    .isNumeric().withMessage('Mã OTP chỉ gồm chữ số'),
  body('newPassword')
    .notEmpty().withMessage('Mật khẩu mới là bắt buộc')
    .isLength({ min: 8 }).withMessage('Mật khẩu tối thiểu 8 ký tự')
    .matches(/[A-Z]/).withMessage('Mật khẩu phải có ít nhất 1 chữ hoa')
    .matches(/[0-9]/).withMessage('Mật khẩu phải có ít nhất 1 chữ số'),
  body('confirmNewPassword')
    .notEmpty().withMessage('Vui lòng nhập lại mật khẩu mới')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword)
        throw new Error('Mật khẩu xác nhận không khớp');
      return true;
    }),
  validate,
];

export {
  sendOtpRules,
  verifyOtpRules,
  registerRules,
  loginRules,
  socialLoginRules,
  updateProfileRules,
  changePasswordRules,
  forgotPasswordRules,
  resetPasswordRules,
};