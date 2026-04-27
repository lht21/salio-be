import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const grammarAnswerResultSchema = new Schema({
    questionId: { type: String, required: true },
    userAnswer: { type: Schema.Types.Mixed },
    correctAnswer: { type: Schema.Types.Mixed },
    isCorrect: { type: Boolean, default: false },
    points: { type: Number, default: 0 }
}, { _id: false });

const grammarExerciseResultSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    grammar: { type: Schema.Types.ObjectId, ref: 'Grammar', required: true },
    answers: [grammarAnswerResultSchema],
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

grammarExerciseResultSchema.index({ user: 1, grammar: 1, createdAt: -1 });

export default mongoose.model('GrammarExerciseResult', grammarExerciseResultSchema);
