import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const writingSchema = new Schema({
    // Basic information
    title: { type: String, required: true },
    type: {
        type: String,
        enum: ['paragraph', 'email', 'sentence', 'story', 'essay', 'letter', 'description'],
        default: 'paragraph'
    },
    prompt: { type: String, required: true },
    instruction: { type: String },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    // Word requirements
    minWords: { type: Number, default: 50 },
    maxWords: { type: Number },
    targetWords: { type: Number },
    
    // Level and difficulty
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Dễ', 'Trung bình', 'Khó'],
        default: 'Trung bình'
    },
    
    // Content support - THÊM CÁC TRƯỜNG NÀY ĐỂ KHỚP VỚI MOCK DATA
    wordHint: [{ type: String }],
    grammarHint: [{ type: String }],
    structureHint: { type: String },
    
    // Sample content - THÊM CÁC TRƯỜNG NÀY
    sampleAnswer: { type: String },
    sampleTranslation: { type: String },
    sampleWordCount: { type: Number },
    
    // Time management
    estimatedTime: { type: Number, default: 30 },
    timeLimit: { type: Number },
       
    // Statistics
    attemptCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageWordCount: { type: Number, default: 0 },
    
    // Status and metadata
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Evaluation criteria
    evaluationCriteria: {
        grammarWeight: { type: Number, default: 25 },
        vocabularyWeight: { type: Number, default: 25 },
        structureWeight: { type: Number, default: 20 },
        contentWeight: { type: Number, default: 20 },
        coherenceWeight: { type: Number, default: 10 }
    },
    
    // Tags for search and organization
    tags: [{ type: String }]
}, { 
    timestamps: true,
    toJSON: { virtuals: true }
});

// Virtuals giữ nguyên
writingSchema.virtual('wordRange').get(function() {
    if (this.minWords && this.maxWords) {
        return `${this.minWords}-${this.maxWords} từ`;
    }
    return `Tối thiểu ${this.minWords} từ`;
});

writingSchema.virtual('difficultyColor').get(function() {
    const colors = {
        'Dễ': 'green',
        'Trung bình': 'yellow', 
        'Khó': 'red'
    };
    return colors[this.difficulty] || 'gray';
});

// Indexes giữ nguyên
writingSchema.index({ level: 1, difficulty: 1 });
writingSchema.index({ type: 1 });
writingSchema.index({ title: 'text', prompt: 'text' });
writingSchema.index({ author: 1 });
writingSchema.index({ lesson: 1 });
writingSchema.index({ tags: 1 });

export default mongoose.model('Writing', writingSchema);