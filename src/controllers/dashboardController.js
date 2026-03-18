import User from '../models/User.js';
import Payment from '../models/Payment.js'
import Lesson from '../models/Lesson.js'
import ExamResult from '../models/ExamResult.js' // Dùng để lấy recent activity tạm thời
import { format } from 'morgan';

// const getDashboardData = async (req, res) => {
//     try {
//         const stats = await dashboardService.getDashboardStats();

//         // Lấy hoạt động gần đây (Tạm thời lấy 5 user mới đăng ký và 5 user vừa update)
//         // Lý tưởng nhất là bạn nên tạo thêm model ActivityLog để lưu: Ai làm gì, lúc nào.
//         const recentUsers = await User.find({ role: 'student' })
//             .sort({ updatedAt: -1 })
//             .limit(5)
//             .select('fullName updatedAt level');

//         const recentActivity = recentUsers.map(u => ({
//             type: 'user',
//             user: u.fullName,
//             action: 'cập nhật tiến độ',
//             target: u.level,
//             time: u.updatedAt
//         }));

//         const finalData = {
//             ...stats,
//             recentActivity // Gộp vào response
//         };

//         res.status(200).json({
//             success: true,
//             data: finalData
//         });
//     } catch (error) {
//         console.error("Dashboard Error:", error);
//         res.status(500).json({
//             success: false,
//             message: 'Lỗi server khi tải dữ liệu thống kê.'
//         });
//     }
// };


//////////ADMIN//////////////

// lấy số liệu tổng quan cho hàng trên cùng
const getDashboardStats = async (req, res) => {
    try {
        // tổng số User và User mới trong tháng này
        const totalUsers = await User.countDocuments();

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        const newUsersThisMonth = await User.countDocuments({
            createdAt: { $gte: startOfMonth}
        })

        //Tổng doanh thu 
        const revenueAgg = await Payment.aggregate([
            { $match: { status: 'completed'}},
            { $group: { _id: null, total: { $sum: "$amount"}}}
        ]);

        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

        //tổng số bài học
        const totalLessons = await Lesson.countDocuments();

        //tổng số lượt thi
        const totalExamAttempts = await ExamResult.countDocuments();

        res.json({
            totalUsers,
            newUsersThisMonth,
            totalRevenue,
            totalLessons,
            totalExamAttempts
        })


        
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server', error: error.message });
    }
}


///biểu đồ tăng trưởng user 12 tháng gần nhất
const getUserGrowthData = async (req, res) => {
    try {
        const stats = await User.aggregate([
            { $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$createdAt"}},
                count: { $sum: 1}
            }},
            { $sort: { _id: 1}},
            { $limit: 12}
        ])

        res.json(stats)
        
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server', error: error.message });
    }
}


///biểu đồ doanh thu 30 ngày gần nhất
const getRevenueChart = async (req, res) => {
    try {
        const stats = await Payment.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 } // 30 ngày gần nhất
        ])

        res.json(stats);
        
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server', error: error.message });
    }
}

export {getDashboardStats, getRevenueChart, getUserGrowthData}