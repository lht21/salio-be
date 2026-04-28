import UserProgress from '../models/UserProgress.js';
import { ok, serverError, badRequest, notFound } from '../utils/response.js';

export const MISSIONS_CONFIG = {
    'D1': { id: 'D1', title: 'Điểm danh', condition: 'Check-in', target: 1, reward: 10 },
    'D2': { id: 'D2', title: 'Học từ vựng', condition: 'Học 10 từ', target: 10, reward: 15 },
    'D3': { id: 'D3', title: 'Làm Writing', condition: 'Hoàn thành 1 bài', target: 1, reward: 20 },
    'D4': { id: 'D4', title: 'Luyện Speaking', condition: 'Hoàn thành 1 bài', target: 1, reward: 20 },
    'D5': { id: 'D5', title: 'Giữ streak', condition: 'Học trong ngày', target: 1, reward: 5 }
};

export const STORE_ITEMS = {
    'R1': { id: 'R1', title: 'Streak Freeze', desc: 'Bảo vệ chuỗi ngày học không bị đứt 1 ngày', price: 100, icon: '❄️' },
    'R2': { id: 'R2', title: 'Double Reward', desc: 'Nhân đôi số mây nhận được trong 24 giờ', price: 150, icon: '🌟' },
    'R3': { id: 'R3', title: 'AI Writing Pro', desc: 'Mở khóa 1 lượt chấm chữa lỗi AI chuyên sâu', price: 300, icon: '🤖' },
    'R4': { id: 'R4', title: 'Skip Mission', desc: 'Tự động hoàn thành 1 nhiệm vụ hằng ngày khó', price: 80, icon: '⏭️' },
    'R5': { id: 'R5', title: 'Huy hiệu VIP', desc: 'Sở hữu huy hiệu độc quyền trên bảng xếp hạng', price: 250, icon: '🏅' },
    'R6': { id: 'R6', title: 'Revive Streak', desc: 'Khôi phục lại chuỗi ngày học vừa đánh mất', price: 200, icon: '❤️‍🔥' },
    'R7': { id: 'R7', title: 'Unlock Exam', desc: 'Mở khóa vĩnh viễn 1 đề thi Premium bất kỳ', price: 200, icon: '🔓' }
};

export const dailyCheckIn = async (req, res) => {
    try {
        const userId = req.user._id;
        let progress = await UserProgress.findOne({ user: userId });
        
        if (!progress) {
            progress = await UserProgress.initForUser(userId);
        }

        const today = new Date().toISOString().slice(0, 10);
        if (progress.gamification.activeDates.includes(today)) {
            return badRequest(res, 'Bạn đã điểm danh hôm nay rồi!');
        }

        // Đánh dấu ngày hoạt động, tính streak và ghi nhận nhiệm vụ D1
        progress.recordActiveDay();
        progress.updateMissionProgress('D1', 1);
        
        // Thưởng thêm nếu đạt mốc streak (VD: 7 ngày)
        let bonusMessage = '';
        if (progress.gamification.currentStreak % 7 === 0) {
            progress.addClouds(50);
            bonusMessage = ' và 50 mây thưởng mốc 7 ngày!';
        }

        await progress.save();

        return ok(res, progress.gamification, `Điểm danh thành công! Hãy vào mục Nhiệm vụ để nhận mây nhé!${bonusMessage}`);
    } catch (error) {
        return serverError(res, 'Lỗi điểm danh: ' + error.message);
    }
};

export const getDailyMissions = async (req, res) => {
    try {
        const userId = req.user._id;
        let progress = await UserProgress.findOne({ user: userId });
        if (!progress) progress = await UserProgress.initForUser(userId);

        // Mẹo: Kích hoạt hàm dummy để tự động reset ngày mới nếu user chưa làm gì hôm nay
        progress.updateMissionProgress('D0', 0); 
        await progress.save();

        const userMissions = progress.gamification.dailyQuest.missions;
        
        // Gắn cấu hình cố định vào tiến độ thực tế để trả về Client hiển thị
        const displayMissions = userMissions.map(m => {
            const config = MISSIONS_CONFIG[m.id];
            return {
                ...config,
                progress: Math.min(m.progress, config.target),
                isClaimed: m.isClaimed,
                isCompleted: m.progress >= config.target
            };
        });

        return ok(res, displayMissions, 'Lấy danh sách nhiệm vụ thành công');
    } catch (error) {
        return serverError(res, 'Lỗi lấy nhiệm vụ: ' + error.message);
    }
};

export const claimMissionReward = async (req, res) => {
    try {
        const { missionId } = req.body; // 'D1', 'D2'...
        const userId = req.user._id;

        const config = MISSIONS_CONFIG[missionId];
        if (!config) return badRequest(res, 'Nhiệm vụ không tồn tại');

        let progress = await UserProgress.findOne({ user: userId });
        if (!progress) return notFound(res, 'Không tìm thấy dữ liệu học tập');

        const mission = progress.gamification.dailyQuest.missions.find(m => m.id === missionId);
        
        if (!mission) return badRequest(res, 'Nhiệm vụ chưa được khởi tạo hôm nay');
        if (mission.isClaimed) return badRequest(res, 'Bạn đã nhận thưởng nhiệm vụ này rồi');
        if (mission.progress < config.target) return badRequest(res, 'Nhiệm vụ chưa hoàn thành');

        // Đánh dấu đã nhận và cộng tiền thưởng
        mission.isClaimed = true;
        progress.addClouds(config.reward);
        
        // Kiểm tra xem tất cả nhiệm vụ trong ngày đã được nhận thưởng chưa
        const allClaimed = progress.gamification.dailyQuest.missions.every(m => m.isClaimed);
        let bonusMessage = '';
        if (allClaimed) {
            progress.addClouds(30);
            bonusMessage = ' Tuyệt vời! Bạn nhận thêm 30 ☁️ vì đã hoàn thành toàn bộ nhiệm vụ hôm nay!';
        }

        await progress.save();

        return ok(res, { clouds: progress.gamification.clouds }, `Nhận thành công ${config.reward} ☁️!${bonusMessage}`);
    } catch (error) {
        return serverError(res, 'Lỗi nhận thưởng nhiệm vụ: ' + error.message);
    }
};

export const getStoreItems = async (req, res) => {
    try {
        const userId = req.user._id;
        const progress = await UserProgress.findOne({ user: userId });
        
        return ok(res, {
            clouds: progress?.gamification?.clouds || 0,
            inventory: progress?.gamification?.inventory || {},
            store: Object.values(STORE_ITEMS)
        }, 'Lấy danh sách cửa hàng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi lấy cửa hàng: ' + error.message);
    }
};

export const purchaseItem = async (req, res) => {
    try {
        const { itemId, payload } = req.body; // payload dùng cho R4 (missionId) và R7 (examId)
        const userId = req.user._id;

        const itemConfig = STORE_ITEMS[itemId];
        if (!itemConfig) return badRequest(res, 'Vật phẩm không tồn tại');

        let progress = await UserProgress.findOne({ user: userId });
        if (!progress) return notFound(res, 'Không tìm thấy dữ liệu người dùng');

        // Hàm spendClouds đã có sẵn validation ném lỗi nếu không đủ tiền
        try {
            progress.spendClouds(itemConfig.price);
        } catch (e) {
            return badRequest(res, 'Bạn không đủ ☁️ để mua vật phẩm này!');
        }

        // Xử lý logic theo từng món đồ
        switch (itemId) {
            case 'R1': // Streak Freeze
                progress.gamification.inventory.streakFreezes += 1;
                break;
            
            case 'R2': // Double Reward (24h)
                progress.gamification.inventory.doubleRewardEndDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                break;
            
            case 'R3': // AI Pro
                progress.gamification.inventory.advancedAIAttempts += 1;
                break;
            
            case 'R4': // Skip Mission
                if (!payload || !payload.missionId) return badRequest(res, 'Vui lòng chọn nhiệm vụ cần bỏ qua (payload.missionId)');
                const mission = progress.gamification.dailyQuest.missions.find(m => m.id === payload.missionId);
                if (!mission) return badRequest(res, 'Nhiệm vụ không tồn tại trong hôm nay');
                if (mission.isClaimed) return badRequest(res, 'Nhiệm vụ này đã được nhận thưởng rồi');
                // Ép tiến độ max để user có thể bấm Claim ngay
                mission.progress = 999; 
                break;
            
            case 'R5': // Rare Badge
                if (!progress.gamification.inventory.badges.includes('VIP_BADGE_1')) {
                    progress.gamification.inventory.badges.push('VIP_BADGE_1');
                }
                break;
            
            case 'R6': // Revive Streak
                const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                if (progress.gamification.activeDates.includes(yesterday)) {
                    return badRequest(res, 'Chuỗi học của bạn vẫn đang an toàn, không cần khôi phục!');
                }
                // Cấp cứu: Chèn ngày hôm qua vào lịch sử và phục hồi mốc cao nhất
                progress.gamification.activeDates.push(yesterday);
                progress.gamification.currentStreak = progress.gamification.highestStreak;
                break;

            case 'R7': // Unlock Exam
                if (!payload || !payload.examId) return badRequest(res, 'Vui lòng chọn bài thi cần mở khóa (payload.examId)');
                if (progress.gamification.inventory.unlockedExams.includes(payload.examId)) {
                    return badRequest(res, 'Bạn đã mở khóa bài thi này rồi!');
                }
                progress.gamification.inventory.unlockedExams.push(payload.examId);
                break;
        }

        await progress.save();
        
        return ok(res, { clouds: progress.gamification.clouds, inventory: progress.gamification.inventory }, `Mua thành công ${itemConfig.title}!`);
    } catch (error) {
        return serverError(res, 'Lỗi giao dịch cửa hàng: ' + error.message);
    }
};

export const getLeaderboard = async (req, res) => {
    try {
        // type có thể là: 'clouds', 'streak', 'mock_score'
        const { type = 'clouds', limit = 50 } = req.query;
        const currentUserId = req.user._id;

        let sortConfig = {};
        let higherCountQuery = {};

        if (type === 'streak') {
            sortConfig = { 'gamification.currentStreak': -1 };
        } else if (type === 'mock_score') {
            sortConfig = { 'statistics.highestMockScore': -1 };
        } else {
            sortConfig = { 'gamification.clouds': -1 }; // Mặc định theo Mây
        }

        // Lấy Top X người dùng
        const topProgresses = await UserProgress.find()
            .sort(sortConfig)
            .limit(Number(limit))
            .populate('user', 'username avatarUrl level');

        const leaderboard = topProgresses.map((p, index) => {
            let score = 0;
            if (type === 'streak') score = p.gamification?.currentStreak || 0;
            else if (type === 'mock_score') score = p.statistics?.highestMockScore || 0;
            else score = p.gamification?.clouds || 0;

            return { rank: index + 1, user: p.user, score };
        }).filter(item => item.user != null); // Lọc bỏ tiến trình mồ côi nếu user bị xoá

        // Tính thứ hạng và điểm của người dùng hiện tại
        let currentUserData = { rank: 0, score: 0 };
        const currentUserProgress = await UserProgress.findOne({ user: currentUserId });
        
        if (currentUserProgress) {
            if (type === 'streak') currentUserData.score = currentUserProgress.gamification.currentStreak;
            else if (type === 'mock_score') currentUserData.score = currentUserProgress.statistics?.highestMockScore || 0;
            else currentUserData.score = currentUserProgress.gamification.clouds;

            // Tìm số người có điểm cao hơn để tính rank
            higherCountQuery[Object.keys(sortConfig)[0]] = { $gt: currentUserData.score };
            const higherCount = await UserProgress.countDocuments(higherCountQuery);
            currentUserData.rank = higherCount + 1;
        }

        return ok(res, { leaderboard, currentUser: currentUserData }, 'Lấy bảng xếp hạng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi lấy bảng xếp hạng: ' + error.message);
    }
};