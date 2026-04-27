import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const writingSubmissionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // ==========================================
    // NGUỒN 1: LUYỆN TẬP TỰ DO & BÀI HỌC (LESSON)
    // ==========================================
    writing: { type: Schema.Types.ObjectId, ref: 'Writing' }, // BỎ required: true
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },   // Có thể null nếu luyện tự do
    
    // ==========================================
    // NGUỒN 2: THI THỬ TOÀN DIỆN (EXAM)
    // ==========================================
    examResult: { type: Schema.Types.ObjectId, ref: 'ExamResult' }, // Link tới phiên làm bài thi
    examQuestionId: { type: String }, // VD: "53" hoặc "54" để biết đang làm câu nào trong đề
    
    // --- NỘI DUNG BÀI LÀM (Dùng chung cho cả 2 nguồn) ---
    content: { type: String, default: '' },
    wordCount: { type: Number, default: 0 },
    charCount: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 },
    
    // --- KẾT QUẢ AI CHẤM (Dùng chung) ---
    status: {
        type: String,
        enum: ['draft', 'pending_ai', 'evaluated', 'ai_failed'],
        default: 'draft'
    },
    evaluation: {
        totalScore: { type: Number },
        // Sử dụng Mixed để lưu trữ trực tiếp cấu trúc mảng JSON từ Gemini
        aiFeedback: { type: Schema.Types.Mixed },
        detailedCorrection: { type: Schema.Types.Mixed }
    }
}, { timestamps: true });

// Tự động kiểm tra tính toàn vẹn dữ liệu (Chỉ được phép thuộc Nguồn 1 HOẶC Nguồn 2)
writingSubmissionSchema.pre('validate', function() {
    if (!this.writing && !this.examResult) {
        throw new Error('Bài nộp phải thuộc về một bài Luyện viết (Writing) HOẶC một Kỳ thi (ExamResult).');
    }
});

export default mongoose.model('WritingSubmission', writingSubmissionSchema);
