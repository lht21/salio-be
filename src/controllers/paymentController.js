import Payment from '../models/Payment.js';
import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { ok, badRequest, notFound, serverError } from '../utils/response.js';

// ======================================================================= //
// HELPER: Kích hoạt Premium & Cộng dồn ngày cho User
// ======================================================================= //
const activateUserPremium = async (userId, planId) => {
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) throw new Error('Không tìm thấy gói cước tương ứng');

    const user = await User.findById(userId);
    if (!user) throw new Error('Không tìm thấy thông tin người dùng');

    const now = new Date();
    let startDate = now;
    let endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    // Nếu user đang có gói Premium và vẫn còn hạn => Cộng dồn ngày
    if (user.subscription?.isActive && user.subscription?.endDate > now) {
        startDate = user.subscription.startDate; // Giữ nguyên ngày bắt đầu cũ
        endDate = new Date(user.subscription.endDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    }

    // Tự động bật gia hạn CHỈ dành cho gói tháng
    let isAutoRenew = false;
    if (plan.type === 'premium_monthly') {
        isAutoRenew = true;
    }

    user.subscription = {
        type: 'premium',
        isActive: true,
        startDate: startDate,
        endDate: endDate,
        isAutoRenew: isAutoRenew
    };

    await user.save();
    return user;
};

/**
 * GET /api/v1/payments
 * Lấy danh sách toàn bộ Payment (Chỉ Admin/Teacher)
 */
export const getAllPayments = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, paymentMethod, startDate, endDate, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const query = {};

        if (status) query.status = status;
        if (paymentMethod) query.paymentMethod = paymentMethod;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        if (search) {
            query.orderId = { $regex: search, $options: 'i' };
        }

        const payments = await Payment.find(query)
            .populate('user', 'username email')
            .populate('plan', 'name type')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Payment.countDocuments(query);

        return ok(res, {
            payments,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy danh sách thanh toán thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách thanh toán: ' + error.message);
    }
};

/**
 * GET /api/v1/payments/:paymentId
 * Xem chi tiết 1 đơn hàng
 */
export const getPaymentById = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const payment = await Payment.findById(paymentId)
            .populate('user', 'username email avatarUrl')
            .populate('plan', 'name type durationDays price');

        if (!payment) return notFound(res, 'Không tìm thấy thông tin đơn hàng');

        // Kiểm tra quyền: Nếu là Student thì chỉ được xem đơn của chính mình
        const isAdmin = ['admin', 'teacher'].includes(req.user.role);
        if (!isAdmin && payment.user._id.toString() !== req.user._id.toString()) {
            return badRequest(res, 'Bạn không có quyền xem đơn hàng này');
        }

        return ok(res, payment, 'Lấy chi tiết đơn hàng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết đơn hàng: ' + error.message);
    }
};

/**
 * PATCH /api/v1/payments/:paymentId/status
 * Cập nhật trạng thái đơn (Chỉ Admin). Nếu completed -> Kích hoạt Premium.
 */
export const updatePaymentStatus = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { status } = req.body; // pending, completed, failed, refunded

        if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
            return badRequest(res, 'Trạng thái không hợp lệ');
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) return notFound(res, 'Không tìm thấy đơn hàng');

        if (payment.status === 'completed' && status !== 'completed') {
            return badRequest(res, 'Không thể đổi trạng thái của đơn hàng đã hoàn thành');
        }

        // Lưu lại trạng thái kiểm tra trước khi gán đè
        const isNewlyCompleted = status === 'completed' && payment.status !== 'completed';
        payment.status = status;
        
        // Nếu admin duyệt tay thành completed
        if (isNewlyCompleted) {
            payment.paidAt = new Date();
            await activateUserPremium(payment.user, payment.plan);
        }

        await payment.save();
        return ok(res, payment, `Đã cập nhật trạng thái đơn hàng thành ${status}`);
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật trạng thái đơn hàng: ' + error.message);
    }
};

/**
 * POST /api/v1/payments/webhook
 * Lắng nghe kết quả từ MoMo / VNPay trả về
 */
export const handleWebhook = async (req, res) => {
    try {
        // TODO: Validate Signature / Checksum từ MoMo hoặc VNPay tại đây
        // Ví dụ MoMo: const { orderId, resultCode, signature } = req.body;
        
        // Mock payload parse (Bạn cần sửa phần này sau khi chốt SDK)
        const { orderId, resultCode, transactionId } = req.body; 

        const payment = await Payment.findOne({ orderId });
        if (!payment) {
            // Vẫn trả về 200 để Gateway ngừng gọi lại (Retry)
            return res.status(200).json({ message: 'Order not found, but webhook received' }); 
        }

        // Ghi lại toàn bộ Payload để Debug
        payment.gatewayResponse = req.body;
        if (transactionId) payment.gatewayTransactionId = transactionId;

        // resultCode === 0 là thành công (Quy ước của MoMo)
        if (resultCode === 0 && payment.status === 'pending') {
            payment.status = 'completed';
            payment.paidAt = new Date();
            
            // Kích hoạt Premium
            await activateUserPremium(payment.user, payment.plan);
        } else if (resultCode !== 0) {
            payment.status = 'failed';
        }

        await payment.save();

        // Phản hồi 200 OK ngay lập tức cho Webhook Gateway
        return res.status(200).json({ success: true, message: 'Webhook processed' });
    } catch (error) {
        console.error('[WEBHOOK ERROR]:', error);
        return res.status(200).json({ success: false, message: 'Internal server error during webhook' });
    }
};

/**
 * POST /api/v1/payments/verify-iap
 * Học viên gửi receipt lên để Verify In-App Purchase (Apple/Google)
 */
export const verifyIAP = async (req, res) => {
    try {
        const { receiptData, platform, planId, transactionId } = req.body;
        
        if (!receiptData || !platform || !planId) {
            return badRequest(res, 'Thiếu thông tin (receiptData, platform, planId)');
        }

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) return notFound(res, 'Gói cước không tồn tại');

        // TODO: Gọi API lên Apple Server / Google Play API để verify receiptData thật
        // const isValid = await verifyWithApple(receiptData);
        const isValid = true; // Giả lập verify thành công

        if (!isValid) {
            return badRequest(res, 'Hóa đơn IAP không hợp lệ');
        }

        // Tạo Record Payment
        const payment = await Payment.create({
            user: req.user._id,
            plan: plan._id,
            amountPaid: plan.price,
            purchasedPlanName: plan.name,
            paymentMethod: platform === 'apple' ? 'apple_iap' : 'google_play',
            orderId: `IAP-${Date.now()}`,
            gatewayTransactionId: transactionId,
            status: 'completed', // Verify qua rồi là pass luôn
            paidAt: new Date(),
            gatewayResponse: { receiptData } // Lưu để đối soát
        });

        // Nâng cấp gói
        await activateUserPremium(payment.user, payment.plan);

        return ok(res, payment, 'Xác thực IAP và nâng cấp gói cước thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi xác thực IAP: ' + error.message);
    }
};

/**
 * POST /api/v1/payments/grant
 * Cấp gói thủ công cho User (Chỉ Admin)
 */
export const grantSubscription = async (req, res) => {
    try {
        const { userId, planId } = req.body;
        if (!userId || !planId) return badRequest(res, 'Vui lòng cung cấp userId và planId');

        const payment = await Payment.create({
            user: userId,
            plan: planId,
            amountPaid: 0,
            purchasedPlanName: 'Cấp bởi Admin',
            paymentMethod: 'admin_gift',
            orderId: `GIFT-${Date.now()}`,
            status: 'completed',
            paidAt: new Date()
        });

        await activateUserPremium(userId, planId);

        return ok(res, payment, 'Đã cấp gói cước thủ công thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cấp gói thủ công: ' + error.message);
    }
};