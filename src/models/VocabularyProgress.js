import mongoose from 'mongoose';

const { Schema } = mongoose;

const vocabularyProgressSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vocabulary: { type: Schema.Types.ObjectId, ref: 'Vocabulary', required: true },
    status: {
        type: String,
        enum: ['learning', 'remembered', 'forgotten'],
        default: 'learning'
    },
    reviewCount: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    lastAnswer: { type: Schema.Types.Mixed },
    lastReviewedAt: { type: Date },
    nextReviewAt: { type: Date }
}, { timestamps: true });

vocabularyProgressSchema.index({ user: 1, vocabulary: 1 }, { unique: true });
vocabularyProgressSchema.index({ user: 1, status: 1, nextReviewAt: 1 });

export default mongoose.model('VocabularyProgress', vocabularyProgressSchema);
