import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const cultureSchema = new Schema({
    // Giống mock data
    title: { type: String, required: true },
    content: { type: String, required: true },
    summary: { type: String }, // Tóm tắt
    subtitle: { type: String }, // Phụ đề
    description: { type: String }, // Mô tả ngắn
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coverImage: { type: String },
    images: [{ type: String }], // Nhiều ảnh minh họa
    videoUrl: { type: String },
    // category: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'CultureCategory', // Tên model của bảng category
    //     required: true
    // },
    subtitle: { type: String }, // Thêm từ mock data
    content: [{
        type: { 
            type: String, 
            enum: ['text', 'image'], 
            required: true 
        },
        content: { type: String }, // Cho type 'text'
        url: { type: String },     // Cho type 'image'
        caption: { type: String }  // Cho type 'image'
    }],
    category: {
        type: String,
        enum: [
            'Tất cả', 'Âm nhạc', 'Ẩm thực', 'Du lịch', 'Điện ảnh', 
            'Gia đình & Xã hội', 'Làm đẹp', 'Lễ hội', 'Lịch sử', 
            'Trang phục', 'Trường học', 'Uống rượu', 'Ứng xử'
        ],
        required: true
    },
    image: { type: String }, // coverImage → image (giống mock data)
    icon: { type: String }, // Thêm từ mock data
    isPremium: { type: Boolean, default: false }, // Thêm từ mock data
    views: { type: Number, default: 0 }, // viewCount → views (giống mock data)
    likes: { type: Number, default: 0 }, // Thêm từ mock data
    
    // Các field từ mock data có thể thêm
    level: { 
        type: String, 
        enum: ['Sơ cấp', 'Trung cấp', 'Cao cấp'],
        default: 'Sơ cấp'
    },
    duration: { type: Number, default: 15 }, // phút
    
    // Vocabulary từ mock data
    vocabulary: [{
        word: { type: String },
        meaning: { type: String },
        pronunciation: { type: String }
    }],
    
    // Giữ lại các field hữu ích từ model cũ
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    images: [{ type: String }],
    videoUrl: { type: String },
    tags: [{ type: String }],
    isPublished: { type: Boolean, default: false },


    // --- CONTENT APPROVAL WORKFLOW ---
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected'],
        default: 'draft'
    },

    // Lý do từ chối (nếu có)
    rejectionReason: { type: String },
    // Người duyệt
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    
    viewCount: { type: Number, default: 0 },
    
    
    publishedAt: { type: Date },
    isPublished: { type: Boolean, default: false }

}, { timestamps: true });

export default mongoose.model('Culture', cultureSchema);