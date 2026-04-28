import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const detectedWordSchema = new Schema({
    word: { type: String },
    confidence: { type: Number }
}, { _id: false });

const speakingEvaluationSchema = new Schema({
    percentage: { type: Number, min: 0, max: 100, default: 0 },
    score: { type: Number, min: 0, max: 100, default: 0 },
    pronunciation: { type: Number, min: 0, max: 100, default: 0 },
    intonation: { type: Number, min: 0, max: 100, default: 0 },
    accuracy: { type: Number, min: 0, max: 100, default: 0 },
    fluency: { type: Number, min: 0, max: 100, default: 0 },
    transcript: { type: String },
    feedback: { type: String },
    suggestions: { type: String },
    strengths: [{ type: String }],
    areasForImprovement: [{ type: String }],
    recommendedExercises: [{ type: String }],
    provider: { type: String },
    rawResult: { type: Schema.Types.Mixed },
    evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    evaluatedAt: { type: Date }
}, { _id: false });

const speakingSubmissionSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    speaking: { type: Schema.Types.ObjectId, ref: 'Speaking', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },

    audioUrl: { type: String, required: true },
    recordingDuration: { type: Number, required: true },
    fileSize: { type: Number },

    wordCount: { type: Number, default: 0 },
    detectedWords: [detectedWordSchema],

    status: {
        type: String,
        enum: ['submitted', 'pending_ai', 'evaluated', 'returned', 'resubmitted', 'failed'],
        default: 'pending_ai'
    },

    evaluation: { type: speakingEvaluationSchema, default: () => ({}) },

    resubmission: {
        originalSubmission: { type: Schema.Types.ObjectId, ref: 'SpeakingSubmission' },
        reason: { type: String },
        resubmittedAt: { type: Date }
    },

    submittedAt: { type: Date, default: Date.now },
    lastAccessed: { type: Date, default: Date.now }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

speakingSubmissionSchema.virtual('isEvaluated').get(function () {
    return this.status === 'evaluated' || this.status === 'returned';
});

speakingSubmissionSchema.virtual('scoreLabel').get(function () {
    const score = this.evaluation?.percentage || this.evaluation?.score || 0;
    if (score >= 90) return 'Xuất sắc';
    if (score >= 80) return 'Rất tốt';
    if (score >= 70) return 'Tốt';
    if (score >= 60) return 'Khá';
    if (score >= 50) return 'Trung bình';
    if (score > 0) return 'Cần cải thiện';
    return 'Chưa chấm';
});

speakingSubmissionSchema.pre('save', function () {
    if (this.isModified('evaluation') && this.evaluation) {
        const { pronunciation, intonation, accuracy, fluency } = this.evaluation;
        const scores = [pronunciation, intonation, accuracy, fluency].map(value => Number(value || 0));
        const hasAnyScore = scores.some(value => value > 0);

        if (hasAnyScore && !this.evaluation.percentage) {
            this.evaluation.percentage = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
        }

        if (hasAnyScore && !this.evaluation.score) {
            this.evaluation.score = this.evaluation.percentage;
        }
    }
});

speakingSubmissionSchema.index({ student: 1, speaking: 1 });
speakingSubmissionSchema.index({ speaking: 1, status: 1 });
speakingSubmissionSchema.index({ student: 1, submittedAt: -1 });
speakingSubmissionSchema.index({ 'evaluation.evaluatedBy': 1 });
speakingSubmissionSchema.index({ status: 1 });

export default mongoose.model('SpeakingSubmission', speakingSubmissionSchema);
