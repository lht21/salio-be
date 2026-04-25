import mongoose from 'mongoose';
const Schema = mongoose.Schema;
import { questionSchema } from '../schemas/question.schema.js';


// Schema chính
const listeningSchema = new Schema({
    title: { type: String, required: true, trim: true },
    audioUrl: { type: String }, // S3 hoặc Cloudinary URL
    duration: { type: Number, default: 0 },     // Tổng thời lượng (giây)

    // 2. VŨ KHÍ SÁT THỦ: Transcript phân rã theo Timestamps
    scripts: [{
        startTime: { type: Number, required: true }, // Giây bắt đầu (VD: 2.5)
        endTime: { type: Number, required: true },   // Giây kết thúc (VD: 5.0)
        korean: { type: String, required: true, trim: true },
        vietnamese: { type: String, required: true, trim: true }
    }],
    
    // 3. Bài tập đính kèm
    questions: [questionSchema],
    
    // 4. Phân loại & Tìm kiếm
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        required: true
    },
   
    tags: [{ type: String, trim: true }], // VD: ['Giao tiếp', 'Bệnh viện', 'Kính ngữ']
    
    // 5. Quản lý hệ thống
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
}, { 
    timestamps: true,
    toJSON: { virtuals: true }
});

const Listening = mongoose.model('Listening', listeningSchema);

export default Listening;
