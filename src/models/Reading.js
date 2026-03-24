import mongoose from 'mongoose';
const Schema = mongoose.Schema;
import { questionSchema } from './schemas/question.schema.js';


const readingSchema = new Schema({
    // --- Nội dung Đọc hiểu ---
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true }, // Đoạn văn tiếng Hàn
    translation: { type: String }, // Bản dịch tiếng Việt (có thể null nếu là bài thi khó)
    
    // --- Nhúng danh sách câu hỏi linh hoạt ---
    questions: [questionSchema],
    
    // --- Phân loại & Meta ---
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
    tags: [{ type: String, trim: true }], // VD: ['Văn hóa', 'Báo chí', 'Biểu đồ']
    
    // --- Các thông số tự động tính toán ---
    wordCount: { type: Number, default: 0 },
    estimatedReadingTime: { type: Number, default: 0 }, // Tính bằng phút
    
    // --- Quản lý hệ thống ---
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }

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