import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
    dailyCheckIn,
    getDailyMissions,
    claimMissionReward,
    getStoreItems,
    purchaseItem,
    getLeaderboard
} from '../controllers/gamificationController.js';

const router = express.Router();

// Tất cả các API Gamification đều yêu cầu người dùng phải đăng nhập
router.use(protect);

// 🏆 Bảng xếp hạng (Leaderboard)
router.get('/leaderboard', getLeaderboard);

// 🔥 Điểm danh hàng ngày
router.post('/check-in', dailyCheckIn);

// 🎯 Nhiệm vụ hàng ngày
router.get('/missions', getDailyMissions);
router.post('/missions/claim', claimMissionReward);

// 🛒 Cửa hàng đổi thưởng
router.get('/store', getStoreItems);
router.post('/store/purchase', purchaseItem);

export default router;