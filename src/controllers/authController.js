import User from "../models/User.js";
import jwt from 'jsonwebtoken';
import sendEmail from "../utils/sendEmail.js";
import hashOTP from "../utils/hashOTP.js"
import crypto from 'crypto'

const register = async (req, res) => {
    const { username, fullName, email, password, role } = req.body;
    try {
        // kiểm tra người dùng tồn tại
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ msg: 'Người dùng đã tồn tại! Vui lòng đăng nhập để sử dụng K-Wave' });
            
        }

        // kiểm tra role
        if (!['student', 'teacher'].includes(role)) {
            return res.status(400).json({ msg: 'Role không hợp lệ!' });
        }

        
        user = new User({
            username,
            fullName,
            email,
            password,
            role
        });

        const verificationToken = user.createEmailVerificationToken();

        await user.save()


        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
        const message = `Cảm ơn bạn đã đăng ký! Vui lòng xác thực email bằng cách nhấn vào link sau: \n\n ${verificationUrl}`;


        await sendEmail({
            email: user.email,
            subject: 'Xác thực tài khoản K-wave',
            message

        })

        res.status(201).json({msg: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.'})
      

    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ msg: 'Lỗi server' });
    }
}

const verifyEmail = async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        })

        if(!user) {
            return res.status(400).json({ msg: 'Token không hợp lệ hoặc đã hết hạn' });
        }


        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        
        

        const frontendVerificationSuccessUrl = "http://localhost:5173/auth/verify?status=success"; 
        return res.redirect(frontendVerificationSuccessUrl);
        
    } catch (error) {
        console.error('Register error:', error);
        
        const frontendVerificationFailureUrl = "http://localhost:5173/auth/verify?status=failure&message=server_error";
        return res.redirect(frontendVerificationFailureUrl);
        
    }
}

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // 1. Kiểm tra email và password có được cung cấp không
        if (!email || !password) {
            return res.status(400).json({ msg: 'Vui lòng cung cấp email và mật khẩu' });
        }

        // 2. Tìm user trong DB
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ msg: 'Email hoặc mật khẩu không chính xác' });
        }
        
        // 3. Kiểm tra user đã xác thực email chưa
        if (!user.isEmailVerified) {
            return res.status(401).json({ msg: 'Vui lòng xác thực email của bạn trước khi đăng nhập' });
        }

        // 4. Tạo và gửi token (7 ngày)
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            msg: 'Đăng nhập thành công!',
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName: user.fullName,
                avatar: user.avatar || 'default-avatar-url', // THÊM DÒNG NÀY
            }
        });


    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ msg: 'Lỗi server' });
    }
}

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'Không tìm thấy người dùng với email này' });
        }

        // 1. Tạo token reset
        const resetOTP = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // 2. Gửi email 
        const message = `Mã OTP để đặt lại mật khẩu của bạn là: ${resetOTP}. Mã này có hiệu lực trong 10 phút.`;
        
        try {
            await sendEmail({
               email: user.email,
               subject: 'Yêu cầu đặt lại mật khẩu',
               message
           });
           res.status(200).json({ msg: 'Mã OTP đã được gửi tới email của bạn.' });
        } catch(emailError) {
                console.error('LỖI GỬI EMAIL:', emailError);
                // Rollback token nếu gửi mail thất bại
                user.passwordResetToken = undefined;
                user.passwordResetExpires = undefined;
                await user.save({ validateBeforeSave: false });
                return res.status(500).json({ msg: 'Lỗi khi gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.' });
        }

    } catch (error) {
        console.error(error.message);
        res.status(500).json({msg: 'Lỗi khi gửi email đặt lại mật khẩu'});
    }
};

const resetPassword = async (req, res) => {
    const {otp, newPassword} = req.body;

    try {

        const hashedOTP = hashOTP(otp);

            
        // 2. Tìm user với token và thời gian hết hạn
        const user = await User.findOne({
            passwordResetToken: hashedOTP,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
        }
        
        // 3. Đặt mật khẩu mới
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        
        // 4. Đăng nhập người dùng và gửi token mới (7 ngày)
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ msg: "Thay đổi mật khẩu thành công", token });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Lỗi từ server');
    }
};


const resendOtp = async (req, res) => {
    const { email } = req.body; 

    try {
        const user = await User.findOne({ email });
        if (!user) {
            // Vẫn trả về thông báo thành công để tránh bị dò email
            return res.status(200).json({ msg: 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được một mã OTP mới.' });
        }

        // --- BƯỚC QUAN TRỌNG: RATE LIMITING ---
        const sixtySeconds = 60 * 1000;
        if (user.otpLastSentAt && (new Date() - new Date(user.otpLastSentAt) < sixtySeconds)) {
            const timeLeft = Math.ceil((sixtySeconds - (new Date() - new Date(user.otpLastSentAt))) / 1000);
            return res.status(429).json({ msg: `Vui lòng đợi ${timeLeft} giây nữa trước khi yêu cầu mã mới.` });
        }

        const newOtp = user.createPasswordResetToken();
        const subject = 'Mã OTP đặt lại mật khẩu mới';
        const message = `Mã OTP để đặt lại mật khẩu của bạn là: ${newOtp}. Mã này có hiệu lực trong 10 phút.`;
        
        // Cập nhật thời gian gửi OTP lần cuối
        user.otpLastSentAt = new Date();
        await user.save({ validateBeforeSave: false });

        // Gửi email
        await sendEmail({
            email: user.email,
            subject: subject,
            message: message
        });

        res.status(200).json({ msg: 'Một mã OTP mới đã được gửi đến email của bạn.' });

    } catch (error) {
        console.error('Lỗi khi gửi lại OTP:', error.message);
        res.status(500).send('Lỗi từ server');
    }
};



export { register, verifyEmail, login, forgotPassword, resetPassword, resendOtp };