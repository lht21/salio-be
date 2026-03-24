import mongoose from 'mongoose';
import { questionSchema } from './schemas/question.schema.js';
const Schema = mongoose.Schema;

const questionGroupSchema = new Schema({
    instruction: { type: String, required: true },
    passage: { type: String },
    audioUrl: { type: String },
    imageUrl: { type: String },
    questions: [questionSchema]
}, { _id: false });

const examWritingSchema = new Schema({
    questionNumber: { type: Number, required: true },
    points: { type: Number, required: true },
    prompt: { type: String, required: true },
    imageUrl: { type: String },
    wordLimit: { min: Number, max: Number },
    aiConfig: { sampleAnswer: String, focusPoints: [String] }
}, { _id: false });

const examSchema = new Schema({
    title: { type: String, required: true, trim: true },
    examType: { type: String, enum: ['topik1', 'topik2', 'mock_test'], required: true },
    sections: {
        listening: [questionGroupSchema],
        reading: [questionGroupSchema],
        writing: [examWritingSchema]
    },
    duration: {
        listening: { type: Number, default: 60 },
        reading: { type: Number, default: 70 },
        writing: { type: Number, default: 50 }
    },
    totalScore: { type: Number, default: 300 },
    isPremium: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Exam', examSchema);