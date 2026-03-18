import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const readingQuestionSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, auto: true},
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    answer: { type: Number, required: true },
    explanation: { type: String }
}, { 
    _id: true, 
    id: false 

 });

const readingSchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    translation: { type: String, required: true },
    
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 1', 'Trung cấp 2', 'Cao cấp'],
        required: true
    },

    questions: [readingQuestionSchema],
    
    difficulty: {
        type: String,
        enum: ['Dễ', 'Trung bình', 'Khó'],
        default: 'Trung bình'
    },
    
    author: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: false 
    },
    
    lesson: { 
        type: Schema.Types.ObjectId, 
        ref: 'Lesson',
        required: false 
    },
    
    // Các field thống kê - không bắt buộc
    viewCount: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    
    // Metadata tùy chọn
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },
    wordCount: { type: Number, default: 0 },
    estimatedReadingTime: { type: Number, default: 0 },
    tags: [{ type: String }]
}, { 
    timestamps: true,
    toJSON: { virtuals: true }
});

// Virtual để tính số câu hỏi
readingSchema.virtual('questionCount').get(function() {
    return this.questions.length;
});

// Pre-save middleware - TỰ ĐỘNG TÍNH TOÁN
readingSchema.pre('save', function(next) {
    // Tính word count từ content
    if (this.content && this.isModified('content')) {
        this.wordCount = this.content.trim().split(/\s+/).length;
    }
    
    // Tính estimated reading time (giả định 200 từ/phút)
    if (this.wordCount > 0) {
        this.estimatedReadingTime = Math.ceil(this.wordCount / 200);
    }
    
    // Tự động set difficulty dựa trên level nếu chưa có
    if (!this.difficulty) {
        if (this.level.includes('Sơ cấp')) {
            this.difficulty = 'Dễ';
        } else if (this.level.includes('Trung cấp')) {
            this.difficulty = 'Trung bình';
        } else {
            this.difficulty = 'Khó';
        }
    }
    
    next();
});

// Index cho performance
readingSchema.index({ level: 1, difficulty: 1 });
readingSchema.index({ title: 'text', content: 'text' });
readingSchema.index({ author: 1 });
readingSchema.index({ lesson: 1 });

export default mongoose.model('Reading', readingSchema);