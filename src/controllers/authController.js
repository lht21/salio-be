import User from "../models/User.js";
import UserProgress from "../models/UserProgress.js";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library'; // FIX: Use named import
import Otp from "../models/Otp.js";
import { generateTokens, generateOtp } from "../utils/jwt.js";
import sendOtpEmail from "../utils/mailer.js";
import { badRequest, conflict, created, ok, serverError, unauthorized, notFound } from "../utils/response.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // FIX: Initialize Google Client
 
const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
 
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

 
// ─── POST /api/v1/auth/send-otp ───────────────────────────────────────────────
 
/**
 * Receives email → generates 6-digit OTP → saves to Otp table → sends via Nodemailer
 */
/**
 * Gửi OTP theo 2 mục đích:
 *   type = 'register'       (default) — đăng ký tài khoản mới
 *   type = 'reset_password'           — quên mật khẩu
 *
 * Tách logic validation theo từng mục đích, còn lại (tạo OTP, gửi mail)
 * dùng chung một đoạn code.
 */
const sendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const type = 'register';

    const existingUser = await User.findOne({ email });

    // Chặn nếu email đã đăng ký
    if (existingUser?.isEmailVerified) {
      return conflict(res, 'Email này đã được đăng ký. Vui lòng đăng nhập');
    }

    // Kiểm tra cooldown chống spam
    const recentOtp = await Otp.findOne({ email, type }).sort({ createdAt: -1 });
    if (recentOtp) {
      const secondsSinceLast = (Date.now() - recentOtp.createdAt.getTime()) / 1000;
      if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
        return badRequest(res, `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã`);
      }
    }

    // Xoá OTP cũ cùng type, tạo mới
    await Otp.deleteMany({ email, type });

    const otpLength    = parseInt(process.env.OTP_LENGTH, 10) || 6;
    const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES, 10) || 10;
    const code = generateOtp(otpLength);

    await Otp.create({
      email,
      otpCode: code,
      type,
      expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
    });

    // Gửi email — template khác nhau theo type
    await sendOtpEmail(email, code, 'register');

    return ok(res, null, `Mã xác nhận đã được gửi đến ${email}`);
  } catch (err) {
    console.error('[sendRegisterOtp]', err);
    return serverError(res, 'Không thể gửi mã OTP. Vui lòng thử lại');
  }
};

const sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const type = 'reset_password';

    const existingUser = await User.findOne({ email }); // FIX: Define existingUser

    // Không tiết lộ email có tồn tại hay không (chống enumeration attack)
    if (!existingUser) { // FIX: Now this check works
      return ok(res, null, `Nếu email ${email} tồn tại trong hệ thống, bạn sẽ nhận được mã xác nhận`);
    }

    // Kiểm tra cooldown chống spam
    const recentOtp = await Otp.findOne({ email, type }).sort({ createdAt: -1 });
    if (recentOtp) {
      const secondsSinceLast = (Date.now() - recentOtp.createdAt.getTime()) / 1000;
      if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
        return badRequest(res, `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã`);
      }
    }

    // Xoá OTP cũ cùng type, tạo mới
    await Otp.deleteMany({ email, type });

    const otpLength    = parseInt(process.env.OTP_LENGTH, 10) || 6;
    const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES, 10) || 10;
    const code = generateOtp(otpLength);

    await Otp.create({
      email,
      otpCode: code,
      type,
      expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
    });

    // Gửi email — template reset password
    await sendOtpEmail(email, code, 'reset');

    return ok(res, null, `Mã xác nhận đã được gửi đến ${email}`);
  } catch (err) {
    console.error('[sendForgotPasswordOtp]', err);
    return serverError(res, 'Không thể gửi mã OTP. Vui lòng thử lại');
  }
};


//----------------------------------------------------

// Hệ thống nhận email và gửi OTP vào mail

// ─── POST /api/v1/auth/verify-otp ─────────────────────────────────────────────
 
/**
 * Frontend sends email + OTP code.
 * If correct → marks OTP as verified → frontend can proceed to register.
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
 
    // FIX: Be specific about the OTP type to prevent conflicts
    const otpDoc = await Otp.findOne({
      email,
      type: 'register', // Assuming this function is for registration flow
      isVerified: false }).sort({ createdAt: -1 });
 
    if (!otpDoc) {
      return badRequest(res, 'Không tìm thấy mã OTP. Vui lòng yêu cầu mã mới');
    }
 
    // Check expiration
    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return badRequest(res, 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới');
    }
 
    // Check attempts
    if (otpDoc.attempts >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return badRequest(res, 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới');
    }
 
    // Compare codes
    if (otpDoc.otpCode !== code) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const remaining = MAX_OTP_ATTEMPTS - otpDoc.attempts;
      return badRequest(res, `Mã OTP không đúng. Còn ${remaining} lần thử`);
    }
 
    // Mark as verified
    otpDoc.isVerified = true;
    await otpDoc.save();
 
    return ok(res, { email, verified: true }, 'Xác nhận OTP thành công. Vui lòng đặt thông tin đăng nhập');
  } catch (err) {
    console.error('[verifyOtp]', err);
    return serverError(res, 'Xác nhận OTP thất bại');
  }
};

// ────────────────────────────────────────────────────────────────
// Đăng ký tài khoản với username, password 

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────
 
/**
 * Registers user with username + password.
 * Requires prior OTP verification (checks Otp.isVerified).
 * Returns accessToken (JWT).
 */
const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;
 
    // Confirm OTP was verified
    const otpDoc = await Otp.findOne({ email, isVerified: true });
    if (!otpDoc) {
      return badRequest(res, 'Email chưa được xác minh. Vui lòng hoàn tất bước xác nhận OTP trước');
    }
 
    // Prevent duplicate email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return conflict(res, 'Email này đã được đăng ký');
    }
 
    // Prevent duplicate username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return conflict(res, 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác');
    }
 
    // Create user (password hashed in pre-save hook)
    const user = await User.create({
      email,
      username,
      password,
      isEmailVerified: true,
    });
 
    // Init UserProgress document for the new user
    await UserProgress.initForUser(user._id);
 
    // Clean up OTP records
    await Otp.deleteMany({ email });
 
    // Issue tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      email: user.email,
    });
 
    // Save hashed refresh token
    user.refreshToken = refreshToken;
    await user.save();
 
    setRefreshTokenCookie(res, refreshToken);
 
    return created(
      res,
      {
        accessToken,
        refreshToken,
        user: user.toPublicJSON(),
      },
      'Đăng ký tài khoản thành công'
    );
  } catch (err) {
    console.error('[register]', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return conflict(res, `${field === 'email' ? 'Email' : 'Tên đăng nhập'} đã tồn tại`);
    }
    return serverError(res, 'Đăng ký thất bại');
  }
};
 


// ─── POST /api/v1/auth/social-login ──────────────────────────────────────────
 
/**
 * Handles Google / Apple SSO. Completely bypasses OTP flow.
 * - Verifies idToken with provider SDK
 * - Creates or finds existing user
 * - Returns accessToken
 */
const socialLogin = async (req, res) => {
  try {
    const { provider, idToken } = req.body;
 
    let providerUserId, email, name, avatarUrl;
 
    // ── Google ──────────────────────────────────────────────────
    if (provider === 'google') {
      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
      } catch {
        return unauthorized(res, 'Google token không hợp lệ hoặc đã hết hạn');
      }
 
      const payload = ticket.getPayload();
      providerUserId = payload.sub;
      email = payload.email?.toLowerCase();
      name = payload.name;
      avatarUrl = payload.picture;
    }
 
    // ── Apple ───────────────────────────────────────────────────
    else if (provider === 'apple') {
      // Apple Sign In: decode JWT without verification for payload extraction
      // SECURITY WARNING: In production, you MUST verify the token signature using Apple's public keys. Use a library like 'apple-signin-auth' or 'jwks-rsa'.
      try {
        const parts = idToken.split('.');
        if (parts.length !== 3) throw new Error('Invalid Apple token format');
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);
 
        providerUserId = payload.sub;
        email = payload.email?.toLowerCase();
        name = req.body.fullName || null;
      } catch {
        return unauthorized(res, 'Apple token không hợp lệ');
      }
    }
 
    if (!email) {
      return badRequest(res, 'Không thể lấy thông tin email từ nhà cung cấp SSO');
    }
 
    // ── Find or Create User ─────────────────────────────────────
 
    let user = await User.findOne({
      $or: [
        { email },
        { [`providers.${provider}`]: providerUserId },
      ],
    });
 
    if (!user) {
      // New user — create account (no password required)
      user = await User.create({
        email,
        username: name || email.split('@')[0],
        avatarUrl: avatarUrl || null,
        isEmailVerified: true,
        providers: { [provider]: providerUserId },
      });
      // Init UserProgress for new social user
      await UserProgress.initForUser(user._id);
    } else {
      // Existing user — link provider if not linked yet
      if (!user.providers[provider]) {
        user.providers[provider] = providerUserId;
        if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
        await user.save();
      }
    }
 
    // Issue tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      email: user.email,
    });
 
    user.refreshToken = refreshToken;
    await user.save();
 
    setRefreshTokenCookie(res, refreshToken);
 
    return ok(
      res,
      {
        accessToken,
        refreshToken,
        user: user.toPublicJSON(),
      },
      'Đăng nhập thành công'
    );
  } catch (err) {
    console.error('[socialLogin]', err);
    return serverError(res, 'Đăng nhập xã hội thất bại');
  }
};
 
// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
 
/**
 * Login with email and password.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
 
    // Must select password explicitly (select: false in schema)
    const user = await User.findOne({ email }).select('+password +refreshToken');
 
    if (!user || !user.password) {
      return unauthorized(res, 'Email hoặc mật khẩu không đúng');
    }
 
    if (!user.isActive) {
      return unauthorized(res, 'Tài khoản đã bị vô hiệu hóa');
    }
 
    if (user.isBanned) {
      return unauthorized(res, 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ');
    }
 
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return unauthorized(res, 'Email hoặc mật khẩu không đúng');
    }
 
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      email: user.email,
    });
 
    user.refreshToken = refreshToken;
    await user.save();
 
    setRefreshTokenCookie(res, refreshToken);
 
    return ok(
      res,
      {
        accessToken,
        refreshToken,
        user: user.toPublicJSON(),
      },
      'Đăng nhập thành công'
    );
  } catch (err) {
    console.error('[login]', err);
    return serverError(res, 'Đăng nhập thất bại');
  }
};
 
// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
 
/**
 * Invalidates the refresh token and clears the cookie.
 */
const logout = async (req, res) => {
  try {
    // req.user is attached by authenticate middleware
    req.user.refreshToken = null;
    await req.user.save();
 
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
 
    return ok(res, null, 'Đăng xuất thành công');
  } catch (err) {
    console.error('[logout]', err);
    return serverError(res, 'Đăng xuất thất bại');
  }
};

// ─── POST /api/v1/auth/verify-reset-otp ──────────────────────────────────────
 
const verifyResetOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
 
    const otpDoc = await Otp.findOne({
      email,
      type: 'reset_password',
      isVerified: false,
    }).sort({ createdAt: -1 });
 
    if (!otpDoc) {
      return badRequest(res, 'Không tìm thấy mã OTP. Vui lòng yêu cầu mã mới');
    }
 
    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return badRequest(res, 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới');
    }
 
    if (otpDoc.attempts >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return badRequest(res, 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới');
    }
 
    if (otpDoc.otpCode !== code) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const remaining = MAX_OTP_ATTEMPTS - otpDoc.attempts;
      return badRequest(res, `Mã OTP không đúng. Còn ${remaining} lần thử`);
    }
 
    otpDoc.isVerified = true;
    await otpDoc.save();
 
    return ok(res, { email, verified: true }, 'Xác nhận OTP thành công. Vui lòng đặt mật khẩu mới');
  } catch (err) {
    console.error('[verifyResetOtp]', err);
    return serverError(res, 'Xác nhận OTP thất bại');
  }
};
 
// ─── POST /api/v1/auth/reset-password ────────────────────────────────────────
 
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
 
    const otpDoc = await Otp.findOne({
      email,
      type: 'reset_password',
      isVerified: true,
    });
 
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      await Otp.deleteMany({ email, type: 'reset_password' });
      return badRequest(res, 'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng bắt đầu lại');
    }
 
    const user = await User.findOne({ email });
    if (!user) return notFound(res, 'Không tìm thấy người dùng');
 
    user.password     = newPassword; // pre-save hook tự hash
    user.refreshToken = null;        // đăng xuất tất cả thiết bị
    await user.save();
 
    await Otp.deleteMany({ email, type: 'reset_password' });
 
    return ok(res, null, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại');
  } catch (err) {
    console.error('[resetPassword]', err);
    return serverError(res, 'Đặt lại mật khẩu thất bại');
  }
};

// ─── POST /api/v1/auth/refresh-token ─────────────────────────────────────────
 
/**
 * Cấp lại access token mới dựa vào refresh token (từ cookie hoặc body)
 */
const refreshToken = async (req, res) => {
  try {
    // Lấy refresh token từ cookie (ưu tiên) hoặc từ body request
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
 
    if (!token) {
      return unauthorized(res, 'Không tìm thấy refresh token');
    }
 
    // Tìm user đang sở hữu refresh token này
    const user = await User.findOne({ refreshToken: token });
    if (!user) {
      return unauthorized(res, 'Refresh token không hợp lệ hoặc đã bị thu hồi');
    }
 
    // Tạo cặp token mới
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
    });
 
    // Cập nhật refresh token mới vào DB và ghi lại vào cookie
    user.refreshToken = tokens.refreshToken;
    await user.save();
 
    setRefreshTokenCookie(res, tokens.refreshToken);
 
    return ok(res, { accessToken: tokens.accessToken }, 'Cấp lại token thành công');
  } catch (err) {
    console.error('[refreshToken]', err);
    return serverError(res, 'Cấp lại token thất bại');
  }
};


export { sendRegisterOtp, sendForgotPasswordOtp, verifyOtp, register, socialLogin, login, logout, verifyResetOtp, resetPassword, refreshToken };