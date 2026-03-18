import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const writingProgressSchema = new Schema({
    // User and writing exercise relationship
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    writing: { type: Schema.Types.ObjectId, ref: 'Writing', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    
    // Progress tracking
    attempts: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    
    // Writing metrics
    averageWordCount: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 },
    wordCountTrend: [{ 
        attempt: { type: Number },
        wordCount: { type: Number },
        submittedAt: { type: Date }
    }],
    
    // Skill progression
    skillScores: {
        grammar: { type: Number, default: 0 },
        vocabulary: { type: Number, default: 0 },
        structure: { type: Number, default: 0 },
        content: { type: Number, default: 0 },
        coherence: { type: Number, default: 0 }
    },
    
    // Completion status
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    
    // Recent activity
    lastAttempt: {
        score: { type: Number },
        wordCount: { type: Number },
        timeSpent: { type: Number },
        submittedAt: { type: Date },
        evaluation: {
            score: { type: Number },
            feedback: { type: String }
        }
    },
    
    // Goals and targets
    targetScore: { type: Number, default: 8 },
    targetWordCount: { type: Number },
    isFavorite: { type: Boolean, default: false },
    
    // Writing habits
    averageWordsPerMinute: { type: Number, default: 0 },
    commonErrorTypes: [{
        type: { type: String },
        count: { type: Number, default: 0 }
    }],
    
    // Metadata
    firstAttempt: { type: Date, default: Date.now },
    lastAccessed: { type: Date, default: Date.now }
}, { 
    timestamps: true 
});

// Middleware giữ nguyên
writingProgressSchema.pre('save', function(next) {
    if (this.bestScore >= this.targetScore && !this.completed) {
        this.completed = true;
        this.completedAt = new Date();
    }
    
    if (this.attempts > 0 && this.lastAttempt && this.lastAttempt.score) {
        this.averageScore = ((this.averageScore * (this.attempts - 1)) + this.lastAttempt.score) / this.attempts;
    }
    
    if (this.averageTimeSpent > 0 && this.averageWordCount > 0) {
        this.averageWordsPerMinute = Math.round((this.averageWordCount / this.averageTimeSpent) * 60);
    }
    
    next();
});

// Indexes giữ nguyên
writingProgressSchema.index({ user: 1, writing: 1 }, { unique: true });
writingProgressSchema.index({ user: 1, completed: 1 });
writingProgressSchema.index({ user: 1, bestScore: -1 });
writingProgressSchema.index({ writing: 1, averageScore: -1 });
writingProgressSchema.index({ user: 1, lastAccessed: -1 });

export default mongoose.model('WritingProgress', writingProgressSchema);