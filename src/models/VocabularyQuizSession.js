import mongoose from 'mongoose';
import { questionSchema } from '../schemas/question.schema.js';

const { Schema } = mongoose;

const vocabularyQuizQuestionSchema = new Schema({
    vocabulary: { type: Schema.Types.ObjectId, ref: 'Vocabulary' },
    question: { type: questionSchema, required: true },
    userAnswer: { type: Schema.Types.Mixed },
    isCorrect: { type: Boolean, default: false }
}, { _id: true });

const vocabularyQuizSessionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'VocabularyQuiz', required: true },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'abandoned'],
        default: 'in_progress'
    },
    questions: [vocabularyQuizQuestionSchema],
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date }
}, { timestamps: true });

vocabularyQuizSessionSchema.index({ user: 1, status: 1, createdAt: -1 });

export default mongoose.model('VocabularyQuizSession', vocabularyQuizSessionSchema);
