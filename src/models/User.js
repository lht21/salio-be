import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const { Schema } = mongoose;

const userSchema = new Schema({
  // Core Info
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'] },
  password: { type: String, required: true, minlength: 6 },
  avatarUrl: { type: String },
  role: { type: String, enum: ['student', 'admin', 'teacher'], default: 'student' },
  level: { type: String, default: 'Sơ cấp 1' },

  googleId: { type: String, unique: true, sparse: true },
  appleId: { type: String, unique: true, sparse: true },

  // Subscription & Limits
  subscription: {
    type: { type: String, enum: ['free', 'premium'], default: 'free' },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: false },
    isAutoRenew: { type: Boolean, default: false } // Đánh dấu có đang tự động gia hạn hay không
  },

  // Auth & Security
  isEmailVerified: { type: Boolean, default: false },
  
  refreshToken: {
    type: String,
    default: null,
    select: false,
  },

  // Preferences
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    language: { type: String, enum: ['vi', 'ko', 'en'], default: 'vi' },
    notifications: {
      enabled: { type: Boolean, default: true },
      dailyReminderTime: { type: String, default: '20:00' }
    },
    voiceGender: { type: String, enum: ['male', 'female'], default: 'female' }
  },

  isActive: {
    type: Boolean,
    default: true,
  },
  isBanned: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });


//----------------------------------------------------


userSchema.virtual('progress', {
  ref: 'UserProgress',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});
 
// Pre-save hook: hash password

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});
 
// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
 
/**
 * Tra ve du lieu public cua user.
 * Neu da populate('progress'), se gan them gamification + statistics vao response.
 */
userSchema.methods.toPublicJSON = function () {
  const base = {
    id: this._id,
    username: this.username,
    email: this.email,
    avatarUrl: this.avatarUrl,
    preferences: this.preferences,
    subscription: this.subscription,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
  };
 
  if (this.progress) {
    base.gamification = this.progress.gamification;
    base.statistics = {
      savedVocabulariesCount: this.progress.statistics?.savedVocabularies?.length ?? 0,
      highestMockScore:       this.progress.statistics?.highestMockScore ?? 0,
      totalStudyTime:         this.progress.statistics?.totalStudyTime ?? 0,
      completedLessonsCount:  this.progress.statistics?.completedLessons?.length ?? 0,
    };
  }
 
  return base;
};

export default mongoose.model('User', userSchema);