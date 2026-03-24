import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const writingSchema = new Schema({
     title: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: [
            'sentence_completion', // Câu 51, 52 (Điền vào chỗ trống)
            'graph_analysis',      // Câu 53 (Phân tích biểu đồ - 200~300 chữ)
            'essay_writing',       // Câu 54 (Nghị luận xã hội - 600~700 chữ)
            'free_writing'         // Luyện viết tự do
        ],
        required: true
    },
    prompt: { type: String, required: true }, // Đề bài chính
    instruction: { type: String }, // Hướng dẫn phụ (VD: Không dùng kính ngữ)
    attachedImage: { type: String }, // (RẤT QUAN TRỌNG) Link ảnh biểu đồ cho câu 53
    
    // --- 2. Ràng buộc Lưới Wongoji & Thời gian ---
    wordLimit: {
        min: { type: Number, default: 200 },
        max: { type: Number, default: 300 }
    },
    timeLimit: { type: Number, default: 1800 }, // Tính bằng giây (VD: 30 phút)
    
    // --- 3. Scaffolding (Hỗ trợ người học) ---
    hints: {
        vocabulary: [{ type: String }], // Gợi ý từ vựng
        grammar: [{ type: String }],    // Gợi ý ngữ pháp nên dùng
        outline: { type: String }       // Gợi ý dàn ý (Mở bài, Thân bài, Kết bài)
    },
    
    // --- 4. Dữ liệu mớm cho AI (AI Evaluation Config) ---
    aiConfig: {
        sampleAnswer: { type: String }, // Bài mẫu điểm tối đa để AI tham chiếu
        focusPoints: [{ type: String }] // Các tiêu chí AI BẮT BUỘC phải soi (VD: "Phải có từ 늘어나다", "Đuôi câu -는다")
    },
    
    // --- 5. Phân loại & Quản lý ---
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        required: true
    },
    tags: [{ type: String, trim: true }], // VD: ['TOPIK II', 'Câu 53', 'Biểu đồ tròn']
    
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }

}, { 
    timestamps: true,
});

// Index tối ưu tìm kiếm đề thi
writingSchema.index({ type: 1, level: 1 });
writingSchema.index({ tags: 1 });

export default mongoose.model('Writing', writingSchema);
