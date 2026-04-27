import mongoose from 'mongoose';
import { questionSchema } from '../schemas/question.schema.js'; // Tái sử dụng lõi câu hỏi

const Schema = mongoose.Schema;

const levelRuleSchema = new Schema({
    minPercent: { type: Number, required: true, min: 0, max: 100 },
    maxPercent: { type: Number, required: true, min: 0, max: 100 },
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        required: true
    },
    skipLessonOrderUpTo: { type: Number, default: 0 },
    skippedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }]
}, { _id: false });

const quizSchema = new Schema({
    title: { type: String, required: true, trim: true }, 
    description: { type: String }, 
    type: {
        type: String,
        enum: ['placement', 'lesson_final'],
        default: 'lesson_final',
        index: true
    },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    
    questions: [questionSchema], 

    sections: {
        listening: [{ type: Schema.Types.ObjectId, ref: 'Listening' }],
        reading: [{ type: Schema.Types.ObjectId, ref: 'Reading' }],
        writing: [{ type: Schema.Types.ObjectId, ref: 'Writing' }],
        speaking: [{ type: Schema.Types.ObjectId, ref: 'Speaking' }]
    },
    
    passingScore: { type: Number, default: 80 }, 
    timeLimit: { type: Number, default: 300 },  
    placementConfig: {
        levelRules: {
            type: [levelRuleSchema],
            default: [
                { minPercent: 0, maxPercent: 24, level: 'Sơ cấp 1', skipLessonOrderUpTo: 0 },
                { minPercent: 25, maxPercent: 44, level: 'Sơ cấp 2', skipLessonOrderUpTo: 5 },
                { minPercent: 45, maxPercent: 59, level: 'Trung cấp 3', skipLessonOrderUpTo: 10 },
                { minPercent: 60, maxPercent: 74, level: 'Trung cấp 4', skipLessonOrderUpTo: 15 },
                { minPercent: 75, maxPercent: 89, level: 'Cao cấp 5', skipLessonOrderUpTo: 20 },
                { minPercent: 90, maxPercent: 100, level: 'Cao cấp 6', skipLessonOrderUpTo: 25 }
            ]
        }
    },
    
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6']
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

quizSchema.index({ type: 1, isActive: 1, updatedAt: -1 });

export default mongoose.model('Quiz', quizSchema);
