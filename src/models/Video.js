import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Model quản lý video bài giảng riêng biệt (nếu upload video)
const videoSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    videoUrl: { type: String, required: true }, // URL stream (VD: Cloudinary, S3, Youtube)
    duration: { type: Number }, // giây
    
    uploader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' }, // Gắn với bài học nào
    
    // --- APPROVAL WORKFLOW ---
    status: {
        type: String,
        enum: ['processing', 'pending', 'approved', 'rejected'], 
        default: 'processing' // Video cần xử lý xong mới chuyển sang pending
    },
    rejectionReason: { type: String },
    
    size: { type: Number }, // bytes
    format: { type: String }, // mp4, mov...

}, { timestamps: true });

export default mongoose.model('Video', videoSchema);