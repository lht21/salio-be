// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: { type: String, required: true, unique: true, trim: true }, 
    fullName: { type: String, required: true }, 
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatar: { type: String, default: 'default-avatar-url' },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student'
    },
    level: { 
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        default: 'Sơ cấp 1'
    },
    topikAchievement: {
        type: Number,
        enum: [1, 2, 3, 4, 5, 6],
        default: null
    },

    // Thông tin premium
    subscription: {
        type: {
            type: String,
            enum: ['free', 'premium_monthly', 'premium_quarterly', 'premium_yearly'],
            default: 'free'
        },
        startDate: { type: Date },
        endDate: { type: Date },
        isActive: { type: Boolean, default: false },
        autoRenew: { type: Boolean, default: false }
    },
    
    // Hạn chế cho tài khoản free
    limits: {
        dailyLessons: { type: Number, default: 3 }, // Số bài học free/ngày
        monthlyExams: { type: Number, default: 2 }, // Số đề thi free/tháng
        canAccessPremiumContent: { type: Boolean, default: false },
        canDownloadMaterials: { type: Boolean, default: false }
    },
    
    // Tiến độ học tập
    progress: {
        completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
        completedExams: [{ type: Schema.Types.ObjectId, ref: 'ExamResult' }],
        streakDays: { type: Number, default: 0 }, // Số ngày học liên tiếp
        totalStudyTime: { type: Number, default: 0 } // Tổng thời gian học (phút)
    },
    
    savedFlashcardSets: [{ type: Schema.Types.ObjectId, ref: 'FlashcardSet' }],
    
    // Thống kê sử dụng
    usageStats: {
        lessonsToday: { type: Number, default: 0 },
        examsThisMonth: { type: Number, default: 0 },
        lastLessonDate: { type: Date },
        lastExamDate: { type: Date }
    },


    //các trường xác thực email
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    otpLastSentAt: { type: Date },


}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
    
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
        
    this.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 phút
    
    return verificationToken;
}

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
        
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 phút
    
    return resetToken;
};

// // Method: Tạo OTP xác thực email
// userSchema.methods.createEmailVerificationToken = function() {
//     // Tạo mã OTP 6 chữ số
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
//     // Hash mã OTP và lưu vào DB
//     this.emailVerificationToken = crypto
//         .createHash('sha256')
//         .update(otp)
//         .digest('hex');
        
//     // Đặt thời gian hết hạn (10 phút)
//     this.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
    
//     // Trả về mã OTP chưa hash để gửi email
//     return otp;
// };

// Method: Tạo OTP reset mật khẩu
userSchema.methods.createPasswordResetToken = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');
        
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    
    return otp;
};


export default mongoose.model('User', userSchema);