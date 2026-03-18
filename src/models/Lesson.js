import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const lessonSchema = new Schema({
    // Thêm các field mới từ frontend
    code: { type: String, required: true }, // Mã bài học: "BÀI 1", "BÀI 2"
    title: { type: String, required: true },
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        required: true
    },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String },
    thumbnail: { type: String },
    order: { type: Number, required: true }, // thứ tự bài học 
    
    // Giữ các reference cho các phần khác
    vocabulary: [{ type: Schema.Types.ObjectId, ref: 'Vocabulary', default: [] }],
    grammar: [{ type: Schema.Types.ObjectId, ref: 'Grammar', default: [] }], // Thêm default []
    listening: [{ type: Schema.Types.ObjectId, ref: 'Listening', default: [] }], // Thêm default []
    speaking: [{ type: Schema.Types.ObjectId, ref: 'Speaking', default: [] }], // Thêm default []
    reading: [{ type: Schema.Types.ObjectId, ref: 'Reading', default: [] }], // Thêm default []
    writing: [{ type: Schema.Types.ObjectId, ref: 'Writing', default: [] }], // Thêm default []
    
    // Premium features
    isPremium: { type: Boolean, default: false },
    previewContent: { type: String },
    estimatedDuration: { type: Number, default: 60 },
    
    // Thống kê
    viewCount: { type: Number, default: 0 },
    completionCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    
    // Trạng thái
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Content Approval Workflow
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected'],
        default: 'draft'
    },
    
    rejectionReason: { type: String },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    
    // Người duyệt
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    adminNote: { type: String }, // Ghi chú của admin
    
    // Xuất bản
    publishedAt: { type: Date },

}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ✅ ĐÃ SỬA: Virtual tính tổng an toàn (Safe navigation)
lessonSchema.virtual('totalComponents').get(function() {
    return (this.vocabulary?.length || 0) + 
           (this.grammar?.length || 0) + 
           (this.listening?.length || 0) + 
           (this.speaking?.length || 0) + 
           (this.reading?.length || 0) + 
           (this.writing?.length || 0);
});

// Virtual để tính thời lượng ước tính tổng
lessonSchema.virtual('totalEstimatedDuration').get(function() {
    let total = this.estimatedDuration || 0;
    return total;
});

export default mongoose.model('Lesson', lessonSchema);