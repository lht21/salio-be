import cron from 'node-cron';
import User from '../models/User.js';

export const startSubscriptionCron = () => {
    // Chạy vào lúc 00:00 (nửa đêm) mỗi ngày: '0 0 * * *'
    // (Mẹo: Trong lúc dev, bạn có thể đổi thành '* * * * *' để cron chạy mỗi phút cho dễ test)
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Bắt đầu kiểm tra các gói Premium hết hạn...');
        try {
            const now = new Date();

            // Tìm và hạ cấp tất cả user có gói premium đang active nhưng endDate đã qua thời điểm hiện tại
            const result = await User.updateMany(
                {
                    'subscription.type': 'premium',
                    'subscription.isActive': true,
                    'subscription.endDate': { $lt: now }
                },
                {
                    $set: {
                        'subscription.type': 'free',
                        'subscription.isActive': false
                    }
                }
            );

            if (result.modifiedCount > 0) {
                console.log(`[CRON] Đã tự động hạ cấp ${result.modifiedCount} tài khoản hết hạn Premium về Cơ bản.`);
                // GỢI Ý: Nếu sau này làm tính năng Notification, bạn có thể tìm find() thay vì updateMany()
                // để lấy danh sách User, sau đó vừa update vừa tạo Notification cho họ.
            }
        } catch (error) {
            console.error('[CRON] Lỗi khi quét gói cước hết hạn:', error);
        }
    });
};