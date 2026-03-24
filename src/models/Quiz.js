import mongoose from 'mongoose';
import { questionSchema } from './schemas/question.schema.js'; // Tái sử dụng lõi câu hỏi

const Schema = mongoose.Schema;

const quizSchema = new Schema({
    // 1. Thông tin cơ bản
    title: { type: String, required: true, trim: true }, // VD: "Bài kiểm tra Vượt rào - Bài 1"
    description: { type: String }, 
    
    // 2. Danh sách câu hỏi (Siêu gọn nhẹ)
    // Team content cứ việc nhét 10 câu trắc nghiệm, kéo thả, điền từ vào đây
    questions: [questionSchema], 
    
    // 3. Cấu hình bài test (Dành cho Logic Vượt rào)
    passingScore: { type: Number, default: 80 }, // Ngưỡng điểm đỗ (tính theo % hoặc thang 100)
    timeLimit: { type: Number, default: 300 },   // Thời gian làm bài (VD: 300 giây = 5 phút)
    
    // 4. Phân loại & Quản lý
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6']
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Quiz', quizSchema);
