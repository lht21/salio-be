import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const answerResultSchema = new Schema({
    questionId: { type: Schema.Types.ObjectId, required: true },
    userAnswer: { type: Schema.Types.Mixed },
    isCorrect: { type: Boolean, required: true },
    points: { type: Number, default: 0 }
}, { _id: false });

const examResultSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
    
    totalScore: { type: Number, default: 0 },
    listeningScore: { type: Number, default: 0 },
    readingScore: { type: Number, default: 0 },
    writingScore: { type: Number, default: 0 },
    
    listeningAnswers: [answerResultSchema],
    readingAnswers: [answerResultSchema],
    writingSubmissions: [{ type: Schema.Types.ObjectId, ref: 'WritingSubmission' }],
    
    timeSpent: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
}, { timestamps: true });

examResultSchema.index({ user: 1, exam: 1 });
examResultSchema.index({ user: 1, status: 1, createdAt: -1 });

export default mongoose.model('ExamResult', examResultSchema);