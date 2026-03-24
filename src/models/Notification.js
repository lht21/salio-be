import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['ai_evaluation', 'streak_reminder', 'payment', 'system', 'new_content'],
        required: true
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    actionParams: {
        screen: { type: String },
        targetId: { type: Schema.Types.ObjectId }
    },
    isRead: { type: Boolean, default: false },
    expiresAt: { type: Date, default: () => Date.now() + 30 * 24 * 60 * 60 * 1000 }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Notification', notificationSchema);