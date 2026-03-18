// models/Comment.js
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // ID của bài học, bài viết văn hóa, tin tức, exam...
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetModel: {
        type: String,
        required: true,
        enum: ['Lesson', 'Culture', 'News', 'Exam', 'FlashcardSet']
    },
    // Hỗ trợ bình luận lồng nhau
    parentComment: { type: Schema.Types.ObjectId, ref: 'Comment' },
    replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    // Tương tác
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likeCount: { type: Number, default: 0 },
    // Kiểm duyệt
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isReported: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
    isHidden: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Comment', commentSchema);