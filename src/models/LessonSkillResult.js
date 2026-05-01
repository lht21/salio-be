import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const answerResultSchema = new Schema({
    questionId: { type: Schema.Types.ObjectId, required: true },
    userAnswer: { type: Schema.Types.Mixed },
    correctAnswer: { type: Schema.Types.Mixed },
    isCorrect: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    maxPoints: { type: Number, default: 0 },
    category: { type: String }
}, { _id: false });

const lessonSkillResultSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    sectionType: {
        type: String,
        enum: ['listening', 'reading'],
        required: true
    },
    itemId: { type: Schema.Types.ObjectId, required: true },
    answers: [answerResultSchema],
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    breakdown: { type: Schema.Types.Mixed },
    timeSpent: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

lessonSkillResultSchema.index({ user: 1, lesson: 1, sectionType: 1, itemId: 1, createdAt: -1 });

export default mongoose.model('LessonSkillResult', lessonSkillResultSchema);
