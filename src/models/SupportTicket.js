// models/SupportTicket.js
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    isInternal: { type: Boolean, default: false }, // True = chỉ admin nhìn thấy (Ghi chú nội bộ)
    createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new Schema({
    // Người yêu cầu
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },

     // Người được gán xử lý (Staff/Admin)
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    
    subject: { type: String, required: true },
    description: { type: String, required: true },


    category: { 
        type: String, 
        enum: ['account', 'payment', 'technical', 'content', 'other'],
        required: true 
    },
    status: {
        type: String,
        enum: ['open', 'pending_user', 'in_progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    // Nội dung trao đổi
    messages: [messageSchema],
    
    // Metadata cho thống kê (ADM010)
    resolvedAt: { type: Date }, // Thời điểm giải quyết xong
    closedAt: { type: Date },   // Thời điểm đóng ticket
    
    // Đánh giá của user sau khi xong (Optional)
    rating: { type: Number, min: 1, max: 5 }

}, { timestamps: true });

export default mongoose.model('SupportTicket', ticketSchema);