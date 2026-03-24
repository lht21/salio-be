import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const subscriptionPlanSchema = new Schema({
    // --- 1. Thông tin hiển thị ---
    name: { type: String, required: true }, // VD: "Salio Master TOPIK 6 Tháng"
    description: { type: String },
    
    // Phân loại gói để App dễ hiển thị UI
    type: {
        type: String,
        enum: ['premium_monthly', 'premium_quarterly', 'premium_yearly', 'lifetime'],
        required: true
    },
    
    // --- 2. Giá cả & Khuyến mãi ---
    price: { type: Number, required: true }, // Giá bán thực tế (VND)
    originalPrice: { type: Number }, // Giá gốc để gạch ngang hiển thị % giảm giá
    durationDays: { type: Number, required: true }, // VD: 30, 90, 365
    
    // --- 3. VŨ KHÍ SÁT THỦ: Tích hợp App Store / Google Play ---
    // ID của gói cước bạn đăng ký trên trang quản lý của Apple/Google
    appleProductId: { type: String },  // VD: "com.salio.premium.1month"
    googleProductId: { type: String }, // VD: "salio_premium_1m"
    
    // --- 4. Quyền lợi (Features) ---
    features: {
        unlimitedLessons: { type: Boolean, default: true },
        unlimitedExams: { type: Boolean, default: true },
        aiWongoji: { type: Boolean, default: true } // Tính năng AI chấm điểm
    },
    featuresList: [{ type: String }], // Mảng các gạch đầu dòng để vẽ lên UI
    
    // --- 5. Quản lý hệ thống ---
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false } // Để gắn huy hiệu "Được mua nhiều nhất"
}, { timestamps: true });

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
