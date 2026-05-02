import mongoose from 'mongoose';
const Schema = mongoose.Schema;

export const questionSchema = new Schema({
    type: { 
        type: String, 
        enum: ['single_choice', 'multiple_choice', 'true_false', 'matching', 'short_answer'],
        required: true 
    },
    points: { type: Number, default: 2 }, // Điểm của câu hỏi (TOPIK thường là 2-3 điểm)
    audioUrl: { type: String },
    imageUrl: { type: String }, // Ảnh đính kèm riêng cho từng câu hỏi
    scripts: [{
        startTime: { type: Number, required: true }, // Giây bắt đầu (VD: 2.5)
        endTime: { type: Number, required: true },   // Giây kết thúc (VD: 5.0)
        korean: { type: String, required: true, trim: true },
        vietnamese: { type: String, required: true, trim: true }
    }],
    questionText: { type: String },
    metadata: {
        options: [{ type: String }],
        matchingPairs: [{ bottomItem: String, topItem: String }],
        blankCount: Number
    },
    correctAnswer: { type: Schema.Types.Mixed, required: true },
    explanation: { type: String }
}, { _id: true });