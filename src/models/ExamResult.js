// models/ExamResult.js
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const answerResultSchema = new Schema({
    section: { type: String, required: true },
    questionId: { type: Number, required: true },
    questionNumber: { type: Number, required: true },
    userAnswer: { type: String },
    correctAnswer: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    timeSpent: { type: Number, default: 0 },
    points: { type: Number, default: 0 }
});

const sectionResultSchema = new Schema({
    sectionName: { type: String, required: true },
    correctAnswers: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    score: { type: Number, required: true },
    totalPoints: { type: Number, required: true },
    timeSpent: { type: Number, required: true },
    accuracy: { type: Number, required: true }
});

// models/ExamResult.js - ĐÃ CẬP NHẬT
const writingAnswerSchema = new Schema({
    // 👇 THÊM TRƯỜNG user (để biết ai làm bài này)
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    
    questionId: { type: String, required: true },
    answer: { type: String, required: true },
    wordCount: { type: Number },
    charCount: { type: Number },
    submittedAt: { type: Date, default: Date.now },
    
    // Điểm chi tiết
    grammar: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 100 
    },
    vocabulary: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 100 
    },
    structure: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 100 
    },
    content: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 100 
    },
    coherence: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 100 
    },
    
    corrections: { type: String },
    suggestions: { type: String },
    
    // Điểm tổng
    score: { 
        type: Number, 
        default: 0,
        min: 0, 
        max: 100 
    },
    feedback: { type: String },
    evaluatedAt: { type: Date },
    evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
        type: String,
        enum: ['pending', 'evaluated', 're-submitted'], // 👈 THÊM trạng thái
        default: 'pending'
    },
    
    // 👇 THÊM CÁC TRƯỜNG MỚI
    attemptNumber: { 
        type: Number, 
        default: 1,  // Số lần làm bài (cho phép làm lại)
        min: 1 
    },
    previousAttempts: [{
        answer: String,
        score: Number,
        submittedAt: Date,
        evaluatedAt: Date
    }],
    isLatest: { 
        type: Boolean, 
        default: true  // Bài nộp mới nhất
    }
}, { timestamps: true }); // 👈 THÊM timestamps cho writing answer riêng

const examResultSchema = new Schema({
    // Thông tin cơ bản
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    examSession: { type: Schema.Types.ObjectId, ref: 'ExamSession' },
    
    // Loại thi (thật hay thử)
    isTrialMode: { type: Boolean, default: false },
    sectionType: { type: String }, // 'listening', 'reading', 'writing'
    
    // Kết quả tổng
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    
    // Thời gian
    timeSpent: { type: Number, required: true }, // Tổng thời gian làm bài (giây)
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: Date.now },
    
    // Chi tiết kết quả
    answers: [answerResultSchema],
    sectionResults: [sectionResultSchema],
    
    // Câu trả lời viết (cần giáo viên chấm)
    writingAnswers: [writingAnswerSchema],
    
    // Phân tích
    weakAreas: [{ type: String }],
    strongAreas: [{ type: String }],
    
    // Thống kê
    rank: { type: Number },
    totalTestTakers: { type: Number },
    percentile: { type: Number }

}, { timestamps: true });

export default mongoose.model('ExamResult', examResultSchema);