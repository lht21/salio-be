import cron from 'node-cron';
import UserProgress from '../models/UserProgress.js';

export const startGamificationCron = () => {
    // Chạy vào lúc 00:05 sáng mỗi ngày: '5 0 * * *'
    // Đặt lúc 00:05 để đảm bảo ngày hôm qua đã thực sự kết thúc trọn vẹn
    cron.schedule('5 0 * * *', async () => {
        console.log('[CRON] Bắt đầu kiểm tra và tự động sử dụng Streak Freeze...');
        try {
            const now = Date.now();
            const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);
            const dayBeforeYesterday = new Date(now - 2 * 86400000).toISOString().slice(0, 10);

            // Tìm tất cả các user đang có chuỗi học > 0 và trong túi đồ có ít nhất 1 bùa Streak Freeze
            const users = await UserProgress.find({
                'gamification.currentStreak': { $gt: 0 },
                'gamification.inventory.streakFreezes': { $gt: 0 }
            });

            let appliedCount = 0;

            for (let progress of users) {
                const activeDates = progress.gamification.activeDates;

                // Điều kiện cứu chuỗi: Hôm qua quên học, nhưng hôm kia có học (chuỗi chỉ mới đứt hôm qua)
                if (!activeDates.includes(yesterday) && activeDates.includes(dayBeforeYesterday)) {
                    // Trừ 1 bùa bảo vệ
                    progress.gamification.inventory.streakFreezes -= 1;
                    
                    // Chèn ngày hôm qua vào lịch sử để duy trì tính liên tục của chuỗi
                    progress.gamification.activeDates.push(yesterday);
                    
                    await progress.save();
                    appliedCount++;
                }
            }

            if (appliedCount > 0) console.log(`[CRON] Đã tự động dùng Streak Freeze cứu chuỗi cho ${appliedCount} người dùng.`);
        } catch (error) {
            console.error('[CRON] Lỗi khi chạy Streak Freeze cron:', error);
        }
    });
};