import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const writingSubmissionSchema = new Schema({
    // Student information - ĐỔI TÊN 'student' THÀNH 'user' ĐỂ THỐNG NHẤT
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Writing exercise information
    writing: { type: Schema.Types.ObjectId, ref: 'Writing', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    
    // Submission content
    content: { type: String, required: true },
    wordCount: { type: Number, required: true },
    charCount: { type: Number, required: true },
    
    // Time tracking
    timeSpent: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
    
    // Draft management
    isDraft: { type: Boolean, default: false },
    draftSavedAt: { type: Date },
    
    // Submission status - THÊM TRẠNG THÁI 'pending' ĐỂ KHỚP MOCK DATA
    status: {
        type: String,
        enum: ['draft', 'submitted', 'pending', 'evaluated', 'returned', 'resubmitted'],
        default: 'submitted'
    },
    
    // Evaluation data
    evaluation: {
        score: { type: Number, min: 0, max: 10 },
        grammar: { type: Number, min: 0, max: 10 },
        vocabulary: { type: Number, min: 0, max: 10 },
        structure: { type: Number, min: 0, max: 10 },
        content: { type: Number, min: 0, max: 10 },
        coherence: { type: Number, min: 0, max: 10 },
        
        feedback: { type: String },
        corrections: { type: String },
        suggestions: { type: String },
        
        // Detailed analysis
        strengths: [{ type: String }],
        areasForImprovement: [{ type: String }],
        commonErrors: [{ 
            type: { type: String },
            description: { type: String },
            correction: { type: String }
        }],
        
        evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        evaluatedAt: { type: Date },
        
        // AI analysis
        aiScore: { type: Number },
        aiFeedback: { type: String },
        grammarErrors: [{
            error: { type: String },
            correction: { type: String },
            explanation: { type: String },
            startIndex: { type: Number }, // Thêm cái này
            endIndex: { type: Number }    // Thêm cái này
        }]
    },
    
    // Resubmission data
    resubmission: {
        originalSubmission: { type: Schema.Types.ObjectId, ref: 'WritingSubmission' },
        reason: { type: String },
        improvements: { type: String },
        resubmittedAt: { type: Date }
    },
    
    // Metadata
    lastAccessed: { type: Date, default: Date.now },
    ipAddress: { type: String }
}, { 
    timestamps: true,
    toJSON: { virtuals: true }
});

// Virtuals giữ nguyên
writingSubmissionSchema.pre('validate', function(next) {
    if (this.isModified('content') || this.isNew) {
        const content = this.content || '';
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const characters = content.length;
        
        // Gán giá trị vào field
        this.wordCount = words;
        this.charCount = characters;
    }
    
    // Tính điểm trung bình nếu có
    if (this.isModified('evaluation') && this.evaluation) {
        const { grammar, vocabulary, structure, content, coherence } = this.evaluation;
        if (grammar !== undefined && vocabulary !== undefined && structure !== undefined && content !== undefined && coherence !== undefined) {
            this.evaluation.score = (grammar + vocabulary + structure + content + coherence) / 5;
        }
    }
    
    next();
});


writingSubmissionSchema.virtual('scoreLabel').get(function() {
    if (!this.evaluation.score) return 'Chưa chấm';
    const score = this.evaluation.score;
    if (score >= 9) return 'Xuất sắc';
    if (score >= 8) return 'Rất tốt';
    if (score >= 7) return 'Tốt';
    if (score >= 6) return 'Khá';
    if (score >= 5) return 'Trung bình';
    return 'Cần cải thiện';
});

writingSubmissionSchema.virtual('wordCountStatus').get(function() {
    const writing = this.populated('writing') || this.writing;
    if (!writing || !writing.minWords) return 'unknown';
    
    if (this.wordCount < writing.minWords) return 'below';
    if (writing.maxWords && this.wordCount > writing.maxWords) return 'above';
    return 'good';
});

// Pre-save middleware giữ nguyên
writingSubmissionSchema.pre('save', function(next) {
    if (this.isModified('content')) {
        const words = this.content.trim() ? this.content.trim().split(/\s+/).length : 0;
        const characters = this.content.length;
        this.wordCount = words;
        this.charCount = characters;
    }
    
    if (this.isModified('evaluation') && this.evaluation) {
        const { grammar, vocabulary, structure, content, coherence } = this.evaluation;
        if (grammar && vocabulary && structure && content && coherence) {
            this.evaluation.score = (grammar + vocabulary + structure + content + coherence) / 5;
        }
    }
    
    next();
});

// Indexes - CẬP NHẬT 'student' THÀNH 'user'
writingSubmissionSchema.index({ user: 1, writing: 1 });
writingSubmissionSchema.index({ writing: 1, status: 1 });
writingSubmissionSchema.index({ user: 1, submittedAt: -1 });
writingSubmissionSchema.index({ 'evaluation.evaluatedBy': 1 });
writingSubmissionSchema.index({ status: 1, submittedAt: -1 });

export default mongoose.model('WritingSubmission', writingSubmissionSchema);