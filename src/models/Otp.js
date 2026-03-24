import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const otpSchema = new Schema({
    email: { type: String, required: true },
    otpCode: { type: String, required: true },
    type: { type: String, enum: ['verify_email', 'reset_password'] },
    expiresAt: { type: Date, default: () => Date.now() + 5 * 60 * 1000 } // Tự động xóa sau 5 phút
});
// Setup TTL Index để MongoDB tự động quét dọn rác
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Otp', otpSchema);