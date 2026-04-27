import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const supportTopicSchema = new Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true }, // Nội dung HTML hoặc Markdown
    category: { 
        type: String, 
        required: true,
        enum: ['general', 'payment', 'technical', 'account', 'other'],
        default: 'general'
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('SupportTopic', supportTopicSchema);