import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const speakingSubmissionSchema = new Schema({
    // Student information
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Speaking exercise information
    speaking: { type: Schema.Types.ObjectId, ref: 'Speaking', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    
    // Recording data
    audioUrl: { type: String, required: true },
    recordingDuration: { type: Number, required: true }, // in seconds
    fileSize: { type: Number }, // in bytes
    
    // Content analysis
    wordCount: { type: Number, default: 0 },
    detectedWords: [{ 
        word: { type: String },
        confidence: { type: Number }
    }],
    
    // Submission status
    status: {
        type: String,
        enum: ['submitted', 'evaluated', 'returned', 'resubmitted'],
        default: 'submitted'
    },
    
    // Evaluation data
    evaluation: {
        score: { type: Number, min: 0, max: 10 },
        pronunciation: { type: Number, min: 0, max: 10 },
        fluency: { type: Number, min: 0, max: 10 },
        vocabulary: { type: Number, min: 0, max: 10 },
        grammar: { type: Number, min: 0, max: 10 },
        content: { type: Number, min: 0, max: 10 },
        
        feedback: { type: String },
        suggestions: { type: String },
        
        evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        evaluatedAt: { type: Date },
        
        // Detailed feedback
        strengths: [{ type: String }],
        areasForImprovement: [{ type: String }],
        recommendedExercises: [{ type: String }]
    },
    
    // Resubmission data
    resubmission: {
        originalSubmission: { type: Schema.Types.ObjectId, ref: 'SpeakingSubmission' },
        reason: { type: String },
        resubmittedAt: { type: Date }
    },
    
    // Metadata
    submittedAt: { type: Date, default: Date.now },
    lastAccessed: { type: Date, default: Date.now }
}, { 
    timestamps: true,
    toJSON: { virtuals: true }
});

// Virtual for overall evaluation status
speakingSubmissionSchema.virtual('isEvaluated').get(function() {
    return this.status === 'evaluated' || this.status === 'returned';
});

// Virtual for score label
speakingSubmissionSchema.virtual('scoreLabel').get(function() {
    if (!this.evaluation.score) return 'Chưa chấm';
    const score = this.evaluation.score;
    if (score >= 9) return 'Xuất sắc';
    if (score >= 8) return 'Rất tốt';
    if (score >= 7) return 'Tốt';
    if (score >= 6) return 'Khá';
    if (score >= 5) return 'Trung bình';
    return 'Cần cải thiện';
});

// Pre-save middleware to calculate word count
speakingSubmissionSchema.pre('save', function(next) {
    if (this.isModified('evaluation') && this.evaluation) {
        const { pronunciation, fluency, vocabulary, grammar, content } = this.evaluation;
        if (pronunciation && fluency && vocabulary && grammar && content) {
            this.evaluation.score = (pronunciation + fluency + vocabulary + grammar + content) / 5;
        }
    }
    next();
});

// Indexes for performance
speakingSubmissionSchema.index({ student: 1, speaking: 1 });
speakingSubmissionSchema.index({ speaking: 1, status: 1 });
speakingSubmissionSchema.index({ student: 1, submittedAt: -1 });
speakingSubmissionSchema.index({ 'evaluation.evaluatedBy': 1 });
speakingSubmissionSchema.index({ status: 1 });

export default mongoose.model('SpeakingSubmission', speakingSubmissionSchema);