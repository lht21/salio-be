// models/ExamSession.js
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const examSessionSchema = new Schema({
    // Thông tin cơ bản
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    
    // Trạng thái phiên thi
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'timeout', 'cancelled'],
        default: 'pending'
    },
    
    // Thời gian
    timeLimit: { type: Number, required: true }, // Thời gian tối đa (phút)
    timeRemaining: { type: Number }, // Thời gian còn lại (giây)
    startedAt: { type: Date },
    completedAt: { type: Date },
    
    // Tiến độ làm bài
    currentSection: { 
        type: String, 
        enum: ['listening', 'reading', 'writing'],
        default: 'listening'
    },
    currentQuestion: { type: Number, default: 1 },
    
    // Câu trả lời
    answers: [{
        section: { type: String, required: true },
        questionId: { type: Number, required: true },
        userAnswer: { type: String },
        answeredAt: { type: Date },
        timeSpent: { type: Number, default: 0 }
    }],
    
    // Cài đặt
    allowReview: { type: Boolean, default: true },
    showResultImmediately: { type: Boolean, default: true }

}, { timestamps: true });

export default mongoose.model('ExamSession', examSessionSchema);