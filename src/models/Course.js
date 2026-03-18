import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const courseSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Giáo viên tạo
    thumbnail: { type: String },
    price: { type: Number, default: 0 }, // 0 = Free
    
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6', 'All Levels'],
        required: true
    },

    lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    
    // --- APPROVAL WORKFLOW ---
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected'],
        default: 'draft'
    },
    rejectionReason: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    isPublished: { type: Boolean, default: false },
    studentsCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }

}, { timestamps: true });

export default mongoose.model('Course', courseSchema);