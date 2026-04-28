import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const speakingProgressSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    speaking: { type: Schema.Types.ObjectId, ref: 'Speaking', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },

    attempts: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },

    completed: { type: Boolean, default: false },
    completedAt: { type: Date },

    totalPracticeTime: { type: Number, default: 0 },
    averagePreparationTime: { type: Number, default: 0 },
    averageRecordingTime: { type: Number, default: 0 },

    skillScores: {
        pronunciation: { type: Number, default: 0 },
        intonation: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        fluency: { type: Number, default: 0 },
        vocabulary: { type: Number, default: 0 },
        grammar: { type: Number, default: 0 },
        content: { type: Number, default: 0 }
    },

    lastAttempt: {
        score: { type: Number },
        recordingUrl: { type: String },
        submittedAt: { type: Date },
        evaluation: {
            score: { type: Number },
            feedback: { type: String }
        }
    },

    targetScore: { type: Number, default: 70 },
    isFavorite: { type: Boolean, default: false },

    firstAttempt: { type: Date, default: Date.now },
    lastAccessed: { type: Date, default: Date.now }
}, {
    timestamps: true
});

speakingProgressSchema.index({ user: 1, speaking: 1 }, { unique: true });
speakingProgressSchema.index({ user: 1, completed: 1 });
speakingProgressSchema.index({ user: 1, bestScore: -1 });
speakingProgressSchema.index({ speaking: 1, averageScore: -1 });
speakingProgressSchema.index({ user: 1, lastAccessed: -1 });

export default mongoose.models.SpeakingProgress || mongoose.model('SpeakingProgress', speakingProgressSchema);
