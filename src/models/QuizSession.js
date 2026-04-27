import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const quizAnswerSchema = new Schema({
    sectionType: {
        type: String,
        enum: ['quiz', 'listening', 'reading', 'writing', 'speaking'],
        default: 'quiz'
    },
    itemId: { type: Schema.Types.ObjectId },
    questionId: { type: Schema.Types.ObjectId, required: true },
    userAnswer: { type: Schema.Types.Mixed },
    isCorrect: { type: Boolean, default: false },
    points: { type: Number, default: 0 }
}, { _id: false });

const quizSessionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    purpose: { type: String, enum: ['placement', 'lesson_final'], required: true },
    status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
    answers: [quizAnswerSchema],
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean },
    recommendedLevel: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6']
    },
    skipLessonOrderUpTo: { type: Number, default: 0 },
    skippedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    timeSpent: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date }
}, { timestamps: true });

quizSessionSchema.index({ user: 1, purpose: 1, status: 1, createdAt: -1 });
quizSessionSchema.index({ quiz: 1, createdAt: -1 });

export default mongoose.model('QuizSession', quizSessionSchema);
