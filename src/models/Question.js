// models/Question.js
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const questionSchema = new Schema({
    // Thông tin cơ bản
    exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    section: {
        type: String,
        enum: ['listening', 'reading', 'writing'],
        required: true
    },
    questionNumber: { type: Number, required: true },
    
    // Nội dung câu hỏi
    content: { type: String, required: true },
    options: [{ type: String }], // Cho câu hỏi trắc nghiệm
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    
    // Cho phần nghe
    audioUrl: { type: String },
    transcript: { type: String },
    
    // Cho phần viết
    prompt: { type: String },
    instruction: { type: String },
    wordHint: [{ type: String }],
    grammarHint: [{ type: String }],
    minWords: { type: Number },
    sampleAnswer: { type: String },
    
    // Metadata
    level: { type: String },
    points: { type: Number, default: 1 },
    duration: { type: Number }, // Thời gian ước tính (giây)
    isActive: { type: Boolean, default: true }

}, { timestamps: true });

export default mongoose.model('Question', questionSchema);