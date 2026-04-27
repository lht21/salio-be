import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js';

/**
 * GET /api/v1/subscriptions/plans
 * Lấy danh sách gói. Student: isActive: true. Admin: Không lọc.
 */
export const getPlans = async (req, res) => {
    try {
        const isAdmin = req.user && ['admin', 'teacher'].includes(req.user.role);
        const query = isAdmin ? {} : { isActive: true };

        const plans = await SubscriptionPlan.find(query).sort({ price: 1 });

        return ok(res, plans, 'Lấy danh sách gói cước thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách gói cước: ' + error.message);
    }
};

/**
 * POST /api/v1/subscriptions/plans
 * Tạo gói cước mới (Chỉ Admin)
 */
export const createPlan = async (req, res) => {
    try {
        const { name, type, price, durationDays } = req.body;

        if (!name || !type || price === undefined || !durationDays) {
            return badRequest(res, 'Thiếu thông tin bắt buộc (name, type, price, durationDays)');
        }

        const newPlan = await SubscriptionPlan.create(req.body);
        return created(res, newPlan, 'Tạo gói cước mới thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi tạo gói cước: ' + error.message);
    }
};

/**
 * GET /api/v1/subscriptions/plans/:planId
 * Xem chi tiết gói cước
 */
export const getPlanById = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.planId);
        if (!plan) return notFound(res, 'Không tìm thấy gói cước');

        // Nếu không phải admin và gói đang bị ẩn
        const isAdmin = req.user && ['admin', 'teacher'].includes(req.user.role);
        if (!isAdmin && !plan.isActive) {
            return badRequest(res, 'Gói cước này hiện không khả dụng');
        }

        return ok(res, plan, 'Lấy chi tiết gói cước thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết gói cước: ' + error.message);
    }
};

/**
 * PATCH /api/v1/subscriptions/plans/:planId
 * Cập nhật thông tin gói (Chỉ Admin)
 */
export const updatePlan = async (req, res) => {
    try {
        const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
            req.params.planId,
            req.body,
            { returnDocument: 'after', runValidators: true }
        );

        if (!updatedPlan) return notFound(res, 'Không tìm thấy gói cước để cập nhật');

        return ok(res, updatedPlan, 'Cập nhật gói cước thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật gói cước: ' + error.message);
    }
};

/**
 * DELETE /api/v1/subscriptions/plans/:planId
 * Soft Delete: Cập nhật isActive = false (Chỉ Admin)
 */
export const deletePlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.planId);
        if (!plan) return notFound(res, 'Không tìm thấy gói cước để xóa');

        plan.isActive = false;
        await plan.save();

        return ok(res, null, 'Đã ẩn gói cước thành công (Soft Delete)');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa gói cước: ' + error.message);
    }
};

/**
 * GET /api/v1/subscriptions/current
 * Lấy gói đang kích hoạt của User hiện tại
 */
export const getCurrentSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('subscription');
        if (!user) return notFound(res, 'Không tìm thấy thông tin người dùng');

        return ok(res, user.subscription, 'Lấy thông tin gói hiện tại thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy gói cước hiện tại: ' + error.message);
    }
};

/**
 * GET /api/v1/subscriptions/history
 * Lịch sử thanh toán của User (chỉ lấy status completed)
 */
export const getPaymentHistory = async (req, res) => {
    try {
        const history = await Payment.find({ 
            user: req.user._id,
            status: 'completed'
        })
        .populate('plan', 'name type durationDays')
        .sort({ createdAt: -1 });

        return ok(res, history, 'Lấy lịch sử thanh toán thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy lịch sử thanh toán: ' + error.message);
    }
};

/**
 * POST /api/v1/subscriptions/plans/:planId/checkout
 * Tạo phiên thanh toán cho MoMo/VNPay
 */
export const checkoutPlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const { paymentMethod = 'momo' } = req.body;

        // Kiểm tra xem phương thức thanh toán có hợp lệ với Enum trong Schema không
        const validMethods = ['apple_iap', 'google_play', 'momo', 'vnpay', 'bank_transfer', 'admin_gift'];
        if (!validMethods.includes(paymentMethod)) {
            return badRequest(res, 'Phương thức thanh toán không hợp lệ');
        }

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan || !plan.isActive) {
            return badRequest(res, 'Gói cước không tồn tại hoặc đã ngừng cung cấp');
        }

        // Sinh mã orderId nội bộ (VD: SALIO-171234567890)
        const orderId = `SALIO-${Date.now()}`;

        // Snapshot giá cả và tên gói ngay tại thời điểm tạo giao dịch
        const amountToPay = plan.price;
        
        // Tạo Record Payment (Trạng thái mặc định trong Schema là 'pending')
        const payment = await Payment.create({
            user: req.user._id,
            plan: plan._id,
            amountPaid: amountToPay,
            purchasedPlanName: plan.name,
            paymentMethod: paymentMethod,
            orderId: orderId
        });

        // TODO: Chỗ này sẽ tích hợp SDK của Momo / VNPay để lấy URL thanh toán thực tế.
        // Dưới đây là URL giả lập để App có thể test mở WebView
        let payUrl = '';
        if (paymentMethod === 'momo') {
            payUrl = `https://test-payment.momo.vn/pay?orderId=${orderId}&amount=${amountToPay}`;
        } else if (paymentMethod === 'vnpay') {
            payUrl = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?orderId=${orderId}&amount=${amountToPay}`;
        } else {
            // Xử lý luồng cho In-App Purchase Apple/Google nếu cần
            payUrl = 'in_app_purchase_flow'; 
        }

        return ok(res, {
            orderId: payment.orderId,
            amount: payment.amountPaid,
            payUrl: payUrl
        }, 'Tạo phiên thanh toán thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi khởi tạo thanh toán: ' + error.message);
    }
};

/**
 * POST /api/v1/subscriptions/cancel
 * Hủy tự động gia hạn gói cước của User hiện tại
 */
export const cancelSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return notFound(res, 'Không tìm thấy thông tin người dùng');

        // Kiểm tra xem User có đang sở hữu gói Premium không
        if (!user.subscription || !user.subscription.isActive || user.subscription.type !== 'premium') {
            return badRequest(res, 'Bạn hiện không có gói Premium nào đang hoạt động.');
        }

        // Đánh dấu hủy tự động gia hạn (Người dùng vẫn dùng được đến hết endDate)
        user.subscription.isAutoRenew = false;
        await user.save();

        return ok(res, user.subscription, 'Đã hủy tự động gia hạn. Bạn vẫn có thể sử dụng gói Premium đến hết chu kỳ.');
    } catch (error) {
        return serverError(res, 'Lỗi khi hủy gói cước: ' + error.message);
    }
};