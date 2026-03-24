import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
  // Core Info
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  level: { type: String, default: 'Sơ cấp 1' },

  // Subscription & Limits
  subscription: {
    type: { type: String, enum: ['free', 'premium'], default: 'free' },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: false }
  },

  // Auth & Security
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  otpLastSentAt: { type: Date },

  // Preferences
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    language: { type: String, enum: ['vi', 'ko', 'en'], default: 'vi' },
    notifications: {
      enabled: { type: Boolean, default: true },
      dailyReminderTime: { type: String, default: '20:00' }
    },
    voiceGender: { type: String, enum: ['male', 'female'], default: 'female' }
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);