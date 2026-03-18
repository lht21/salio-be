import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Thông tin thanh toán
    amount: { type: Number, required: true }, // Số tiền
    currency: { type: String, default: 'VND' },
    paymentMethod: {
        type: String,
        enum: ['momo', 'zalopay', 'banking', 'credit_card', 'cash'],
        required: true
    },
    
    // Thông tin giao dịch
    transactionId: { type: String, unique: true }, // ID giao dịch từ cổng thanh toán
    orderId: { type: String, unique: true }, // Mã đơn hàng của hệ thống
    
    // Trạng thái thanh toán
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
        default: 'pending'
    },
    
    // Gói dịch vụ thanh toán
    packageType: {
        type: String,
        enum: ['premium_monthly', 'premium_quarterly', 'premium_yearly', 'exam_package', 'course_package'],
        required: true
    },
    packageName: { type: String, required: true }, // Tên gói: "Gói Premium 1 tháng"
    
    // Thời hạn gói
    startDate: { type: Date },
    endDate: { type: Date },
    
    // Metadata
    description: { type: String },
    metadata: { type: Schema.Types.Mixed }, // Dữ liệu bổ sung
    
    // Thời gian
    paidAt: { type: Date },
    refundedAt: { type: Date },

}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);