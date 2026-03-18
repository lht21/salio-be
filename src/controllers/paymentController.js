import User from "../models/User.js";
import Payment from "../models/Payment.js";


const getTransactions = async (req, res) => {
    try {
        const { pageNumber, status, method,  startDate, endDate, search } = req.query;
        const pageSize = 20;
        const page = Number(pageNumber) || 1;

        const filter = {};

        //lọc theo trạng thái state
        if (status) {
            filter.status = status;
        }

        if(method) {
            filter.paymentMethod = method;
        }

        // lọc theo khoảng thời gian
        if(startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if(endDate) {
                const end = new Date(endDate)
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        //tìm kiếm
        if (search) {
            const users = await User.find({
                $or: [
                    { email: { $regex: search, $options: 'i'}},
                    { username: { $regex: search, $options: 'i'}},
                    { fullName: { $regex: search, $options: 'i'}},
                ]
            }).select('_id');

            const userIds = users.map(u => u._id);
            filter.user = { $in: userIds };
        }

        const count = await Payment.countDocuments(filter);
        const payments = await Payment.find(filter)
            .populate('user', 'fullName email avatar')
            .sort({ createdAt: -1})
            .limit(pageSize)
            .skip(pageSize * (page - 1))

        const revenueStats = await Payment.aggregate([
            { $match: filter},
            { $match: { status: 'completed'}},
            { $group: { _id: null, totalRevenue: { $sum: "$amount"}}}
        ]);

        const totalRevenue = revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;


        res.json({
            payments, page, pages: Math.ceil(count / pageSize), total: count, totalRevenue
        })
        
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server.', error: error.message });
    }
}


const refundTransaction = async (req, res) => {
    try {
        const { reason } = req.body;
        const paymentId = req.params._id;

        const payment = await Payment.findById(paymentId);

        if(!payment) {
            return res.status(404).json({msg: 'Không tìm thấy giao dịch.' })
        }

        if (payment.status !== 'completed') {
            return res.status(400).json({ msg: 'Chỉ có thể hoàn tiền cho giao dịch đã thành công.' });
        }

        /// thiết lập lại trạng thái của giao dịch
        payment.status = 'refunded';
        payment.refundedAt = Date.now();
        payment.description = payment.description 
            ? `${payment.description} - Hoàn tiền: ${reason}` 
            : `Hoàn tiền: ${reason}`;
        
        await payment.save();

        const user = await User.findById(payment.user);
        if (user) {
            user.subscription.isActive = false;
            user.subscription.autoRenew = false;
            user.subscription.type = 'free';
            await user.save();
        }
        
        res.json({ msg: 'Đã hoàn tiền thành công và hủy gói cước của người dùng.', payment });

    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server khi hoàn tiền.', error: error.message });
        
    }
}

const getPaymentStatsToday = async (req, res) => {
    try {

        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        //tính tổng doanh thu hôm nay
        const revenueAgg = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: {$gte: startOfDay, $lte: endOfDay}
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount"}
                }
            }
        ]);

        const todayRevenue = revenueAgg.length > 0 ? revenueAgg[0].todayRevenue : 0;

        const todaySuccessTransactions = await Payment.countDocuments({
            status: 'completed',
            createdAt: { $gte: startOfDay, $lte: endOfDay}
        });

        res.json({
            todayRevenue,
            todaySuccessTransactions
        })
        
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server khi lấy thống kê.', error: error.message });
    }
}

export {getTransactions, refundTransaction, getPaymentStatsToday}