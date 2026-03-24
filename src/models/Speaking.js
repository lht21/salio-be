import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// 1. Định nghĩa Schema bài tập nói (Speaking Exercise)
const speakingSchema = new Schema({
    // --- 1. Thông tin cơ bản ---
    title: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: [
            'pronunciation', // Đọc từng câu (Luyện phát âm)
            'shadowing',     // Nghe và nhại lại y hệt bản gốc
            'role_play',     // Hội thoại nhập vai (A/B)
            'presentation',  // Trình bày theo chủ đề (TOPIK Speaking)
            'free_talk'      // Trả lời câu hỏi tự do
        ],
        required: true
    },
    prompt: { type: String, required: true }, // Đề bài. VD: "Hãy đóng vai nhân viên bán hàng..."
    instruction: { type: String }, // Hướng dẫn chi tiết
    
    // --- 2. VŨ KHÍ AI SHADOWING & ROLE-PLAY ---
    referenceAudioUrl: { type: String }, // (MỚI) File audio gốc của người Hàn để học viên nghe mẫu
    scripts: [{ // (MỚI) Kịch bản linh hoạt cho Role-play hoặc đoạn văn dài
        speaker: { type: String }, // VD: "A", "B", "Nhân viên"
        korean: { type: String, required: true },
        vietnamese: { type: String },
        startTime: { type: Number }, // Đồng bộ sub giống hệt bài Listening
        endTime: { type: Number }
    }],

    // --- 3. Hỗ trợ nội dung (Scaffolding) ---
    targetVocabularies: [{ type: String }], // Gợi ý từ vựng nên dùng
    targetGrammar: [{ type: String }],      // Gợi ý cấu trúc ngữ pháp
    sampleAnswer: { type: String },         // Bài nói mẫu (Text)
    sampleTranslation: { type: String },
    
    // --- 4. Giới hạn thời gian (Dành cho thi TOPIK Speaking) ---
    prepTime: { type: Number, default: 60 },     // Thời gian chuẩn bị (giây) - Đổi tên từ 'duration' cho rõ nghĩa
    recordingLimit: { type: Number, default: 120 }, // Thời gian ghi âm tối đa (giây)
    
    // --- 5. Phân loại & Tìm kiếm ---
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        required: true
    },
    tags: [{ type: String, trim: true }],
    
    // --- 6. Quản lý hệ thống ---
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }


}, { 
    timestamps: true,
    toJSON: { virtuals: true }
});

// Virtual for estimated completion time
speakingSchema.virtual('estimatedCompletionTime').get(function() {
    return this.duration + this.recordingLimit;
});

// Indexes
speakingSchema.index({ level: 1 });
speakingSchema.index({ type: 1 });
speakingSchema.index({ title: 'text', prompt: 'text' });
speakingSchema.index({ author: 1 });
speakingSchema.index({ tags: 1 });

// 2. Định nghĩa Schema tiến độ (Speaking Progress) - BẠN BỊ THIẾU PHẦN NÀY
const speakingProgressSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    exercise: { type: Schema.Types.ObjectId, ref: 'SpeakingExercise', required: true },
    bestScore: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    attempts: [{ 
        score: Number, 
        recordingUrl: String, 
        createdAt: { type: Date, default: Date.now } 
    }]
}, { timestamps: true });

// Middleware cho Progress
speakingProgressSchema.pre('save', function (next) {
  if (this.bestScore >= 80) this.completed = true;
  next();
});

// 3. Tạo Models
// // Sửa lỗi: dùng biến 'speakingSchema' đã định nghĩa ở trên
// const SpeakingExercise = mongoose.model('SpeakingExercise', speakingSchema);

// // Tạo Alias (Tùy chọn, nhưng nên dùng thống nhất một tên)
// const Speaking = SpeakingExercise;

// // Tạo Model Progress
// const SpeakingProgress = mongoose.model('SpeakingProgress', speakingProgressSchema);

// // 3. Export từng model riêng biệt
// export { SpeakingExercise };
// export { Speaking };
// export { SpeakingProgress };

// // 4. Export default
// export default SpeakingExercise;
export default mongoose.model('Speaking', speakingSchema);
