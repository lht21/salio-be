import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const speakingProgressSchema = new Schema({
    // User and speaking exercise relationship
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    speaking: { type: Schema.Types.ObjectId, ref: 'Speaking', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    
    // Progress tracking
    attempts: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    
    // Completion status
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    
    // Time tracking
    totalPracticeTime: { type: Number, default: 0 }, // in seconds
    averagePreparationTime: { type: Number, default: 0 }, // in seconds
    averageRecordingTime: { type: Number, default: 0 }, // in seconds
    
    // Skill progression
    skillScores: {
        pronunciation: { type: Number, default: 0 },
        fluency: { type: Number, default: 0 },
        vocabulary: { type: Number, default: 0 },
        grammar: { type: Number, default: 0 },
        content: { type: Number, default: 0 }
    },
    
    // Recent activity
    lastAttempt: {
        score: { type: Number },
        recordingUrl: { type: String },
        submittedAt: { type: Date },
        evaluation: {
            score: { type: Number },
            feedback: { type: String }
        }
    },
    
    // Goals and targets
    targetScore: { type: Number, default: 8 },
    isFavorite: { type: Boolean, default: false },
    
    // Metadata
    firstAttempt: { type: Date, default: Date.now },
    lastAccessed: { type: Date, default: Date.now }
}, { 
    timestamps: true 
});

// Auto-complete if best score reaches target
speakingProgressSchema.pre('save', function(next) {
    if (this.bestScore >= this.targetScore && !this.completed) {
        this.completed = true;
        this.completedAt = new Date();
    }
    
    // Calculate average score
    if (this.attempts > 0 && this.lastAttempt && this.lastAttempt.score) {
        this.averageScore = ((this.averageScore * (this.attempts - 1)) + this.lastAttempt.score) / this.attempts;
    }
    
    next();
});

// Compound index for unique user-speaking combination
speakingProgressSchema.index({ user: 1, speaking: 1 }, { unique: true });

// Indexes for performance
speakingProgressSchema.index({ user: 1, completed: 1 });
speakingProgressSchema.index({ user: 1, bestScore: -1 });
speakingProgressSchema.index({ speaking: 1, averageScore: -1 });
speakingProgressSchema.index({ user: 1, lastAccessed: -1 });

// Thêm đoạn mongoose.models.SpeakingProgress || ...
export default mongoose.models.SpeakingProgress || mongoose.model('SpeakingProgress', speakingProgressSchema);