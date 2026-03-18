import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const subscriptionPlanSchema = new Schema({
    name: { type: String, required: true }, // "Gói Premium 1 tháng"
    type: {
        type: String,
        enum: ['premium_monthly', 'premium_quarterly', 'premium_yearly', 'exam_package'],
        required: true
    },
    price: { type: Number, required: true },
    originalPrice: { type: Number }, // Giá gốc (nếu có khuyến mãi)
    currency: { type: String, default: 'VND' },
    duration: { type: Number, required: true }, // Thời hạn (ngày)
    
    // Tính năng
    features: {
        unlimitedLessons: { type: Boolean, default: true },
        unlimitedExams: { type: Boolean, default: true },
        premiumContent: { type: Boolean, default: true },
        downloadMaterials: { type: Boolean, default: true },
        personalCoach: { type: Boolean, default: false },
        offlineAccess: { type: Boolean, default: false }
    },
    
    // Giới hạn
    limits: {
        maxExamsPerMonth: { type: Number, default: 0 }, // 0 = unlimited
        maxDownloadsPerMonth: { type: Number, default: 10 }
    },
    
    // Hiển thị
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    description: { type: String },
    featuresList: [{ type: String }] // Danh sách tính năng để hiển thị

}, { timestamps: true });

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);