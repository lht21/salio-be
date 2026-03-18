// models/Exam.js
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const examSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    examType: {
        type: String,
        enum: ['topik1', 'topik2', 'esp'],
        required: true
    },
    category: {
        type: String,
        enum: ['official', 'practice'], // Chính thức hoặc Luyện tập
        default: 'practice'
    },
    listening: { type: Number, default: 0 },
    reading: { type: Number, default: 0 },
    writing: { type: Number, default: 0 },

    duration: { type: Number, required: true },
    isPremium: { type: Boolean, default: false },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Cấu trúc câu hỏi
    questions: {
        listening: [{
            id: { type: Number, required: true },
            type: { type: String, default: 'listening' },
            title: { type: String, required: true },
            audioUrl: { type: String },
            transcript: { type: String },
            translation: { type: String },
            level: { type: String },
            duration: { type: Number },
            questions: [{
                _id: { type: String, required: true },
                question: { type: String, required: true },
                options: [{ type: String }],
                answer: { type: Number, required: true },
                explanation: { type: String }
            }]
        }],
        reading: [{
            id: { type: Number, required: true },
            type: { type: String, default: 'reading' },
            title: { type: String, required: true },
            content: { type: String, required: true },
            translation: { type: String },
            level: { type: String },
            questions: [{
                _id: { type: String, required: true },
                question: { type: String, required: true },
                options: [{ type: String }],
                answer: { type: Number, required: true },
                explanation: { type: String }
            }]
        }],
        writing: [{
            id: { type: Number, required: true },
            type: { type: String, default: 'writing' },
            title: { type: String, required: true },
            prompt: { type: String, required: true },
            instruction: { type: String },
            wordHint: [{ type: String }],
            grammarHint: [{ type: String }],
            minWords: { type: Number },
            level: { type: String },
            sampleAnswer: { type: String },
            sampleTranslation: { type: String }
        }]
    },
    
    // Thông tin thống kê
    totalQuestions: { type: Number, default: 0 },

    //trạng thái hiển thị
    isActive: { type: Boolean, default: true },

    // thống kê
    attemptCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },


    // --- CONTENT APPROVAL WORKFLOW ---
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected'],
        default: 'draft'
    },
    // Lý do từ chối (nếu có)
    rejectionReason: { type: String },
    // Người duyệt
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

}, { timestamps: true });

// Middleware tính tổng số câu hỏi
examSchema.pre('save', function(next) {
    this.totalQuestions = this.listening + this.reading + this.writing;
    next();
});

export default mongoose.model('Exam', examSchema);