import express from 'express';
import { 
    getDashboardStats,
    getRevenueChart,
    getUserGrowthData
} from '../controllers/dashboardController.js';
// Giả sử bạn có middleware checkAuth và checkRole
// import { protect, authorize } from '../middleware/authMiddleware.js';
import {admin, protect} from '../middlewares/authMiddleware.js'

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: API cung cấp dữ liệu thống kê và biểu đồ cho quản trị viên (Admin Only)
 */

// Áp dụng middleware bảo mật cho toàn bộ router này
router.use(protect, admin)

// Chỉ Admin hoặc Teacher mới xem được
// router.get('/stats', protect, authorize('admin', 'teacher'), getDashboardData);
// router.get('/stats', getDashboardData); tạm thời đóng

// --- ADMIN ROUTES ---

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Lấy số liệu thống kê tổng quan (Dashboard Overview)
 *     description: Trả về các con số tổng hợp như tổng số người dùng, bài học, doanh thu, v.v.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về dữ liệu thống kê thành công
 *       401:
 *         description: Không có quyền truy cập (Chưa đăng nhập)
 *       403:
 *         description: Quyền truy cập bị từ chối (Không phải Admin)
 */
router.get('/overview', getDashboardStats);

/**
 * @swagger
 * /api/dashboard/user-growth:
 *   get:
 *     summary: Lấy dữ liệu tăng trưởng người dùng
 *     description: Cung cấp dữ liệu theo thời gian để vẽ biểu đồ tăng trưởng thành viên mới.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về mảng dữ liệu tăng trưởng
 */
router.get('/user-growth', getUserGrowthData);

/**
 * @swagger
 * /api/dashboard/revenue-chart:
 *   get:
 *     summary: Lấy dữ liệu biểu đồ doanh thu
 *     description: Trả về dữ liệu doanh thu định kỳ (theo ngày/tháng) để hiển thị trên biểu đồ.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về dữ liệu doanh thu thành công
 */
router.get('/revenue-chart', getRevenueChart)

export default router;