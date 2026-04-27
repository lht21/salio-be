import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    // --- 1. Định danh ---
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true }, // Link tới gói đã mua
    
    // --- 2. Snapshot Giá cả (Bắt buộc) ---
    // Phải lưu cứng giá và tên gói TẠI THỜI ĐIỂM MUA, đề phòng sau này Admin đổi giá trên bảng SubscriptionPlan
    amountPaid: { type: Number, required: true }, 
    purchasedPlanName: { type: String, required: true },
    
    // --- 3. Cổng thanh toán ---
    paymentMethod: {
        type: String,
        enum: ['apple_iap', 'google_play', 'momo', 'vnpay', 'bank_transfer', 'admin_gift'],
        required: true
    },
    
    // --- 4. Thông tin đối soát (Transaction IDs) ---
    orderId: { type: String, unique: true }, // Mã đơn nội bộ của Salio (VD: SALIO-12345)
    gatewayTransactionId: { type: String },  // Mã giao dịch từ Momo/Apple trả về (Dùng để kiểm tra lỗi)
    
    // --- 5. Trạng thái Giao dịch ---
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    
    // --- 6. Raw Data (Cực kỳ quan trọng để Debug) ---
    // Lưu lại toàn bộ chuỗi JSON mà Apple/Google/Momo ném về server qua Webhook
    gatewayResponse: { type: Schema.Types.Mixed },
    
    paidAt: { type: Date }

}, { timestamps: true });

// Index để load lịch sử mua hàng siêu tốc
paymentSchema.index({ user: 1, status: 1 });

export default mongoose.model('Payment', paymentSchema);
