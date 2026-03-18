import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const cultureCategorySchema = new Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String }, // Icon hoặc emoji
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('CultureCategory', cultureCategorySchema);