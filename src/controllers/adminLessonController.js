// controllers/adminLessonController.js
import { Lesson } from '../models/index.js';

// Lấy danh sách bài học chờ duyệt
export const getPendingLessons = async (req, res) => {
    try {
        const { level, author, page = 1, limit = 10 } = req.query;
        const query = { status: 'pending' };
        
        if (level) query.level = level;
        if (author) query.author = author;

        const lessons = await Lesson.find(query)
            .populate('author', 'fullName email role')
            .populate('vocabulary')
            .populate('grammar') 
            .populate('listening')
            .populate('speaking')
            .populate('reading')
            .populate('writing')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Lesson.countDocuments(query);

        res.json({
            success: true,
            data: {
                lessons,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total
            }
        });
    } catch (error) {
        console.error('Error fetching pending lessons:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bài học chờ duyệt',
            error: error.message
        });
    }
};

// Lấy tất cả bài học (có filter)
export const getAllLessons = async (req, res) => {
    try {
        const { status, level, author, isPublished, page = 1, limit = 10 } = req.query;
        const query = {};
        
        if (status) query.status = status;
        if (level) query.level = level;
        if (author) query.author = author;
        if (isPublished !== undefined) query.isPublished = isPublished === 'true';

        const lessons = await Lesson.find(query)
            .populate('author', 'fullName email role')
            .populate('approvedBy', 'fullName')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Lesson.countDocuments(query);

        res.json({
            success: true,
            data: {
                lessons,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total
            }
        });
    } catch (error) {
        console.error('Error fetching lessons:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bài học',
            error: error.message
        });
    }
};

// Lấy chi tiết bài học
export const getLessonDetail = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id)
            .populate('author', 'fullName email role')
            .populate('approvedBy', 'fullName')
            .populate('vocabulary')
            .populate('grammar')
            .populate('listening')
            .populate('speaking')
            .populate('reading')
            .populate('writing');

        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài học'
            });
        }

        res.json({
            success: true,
            data: lesson
        });
    } catch (error) {
        console.error('Error fetching lesson detail:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết bài học',
            error: error.message
        });
    }
};

// Duyệt bài học
export const approveLesson = async (req, res) => {
    try {
        const { adminNote } = req.body;
        
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài học'
            });
        }

        if (lesson.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Bài học không ở trạng thái chờ duyệt'
            });
        }

        lesson.status = 'approved';
        lesson.approvedBy = req.user.id;
        lesson.approvedAt = new Date();
        lesson.isActive = true;
        if (adminNote) lesson.adminNote = adminNote;

        await lesson.save();

        res.json({
            success: true,
            message: 'Duyệt bài học thành công',
            data: lesson
        });
    } catch (error) {
        console.error('Error approving lesson:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi duyệt bài học',
            error: error.message
        });
    }
};

// Từ chối bài học
export const rejectLesson = async (req, res) => {
    try {
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập lý do từ chối'
            });
        }

        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài học'
            });
        }

        lesson.status = 'rejected';
        lesson.rejectedBy = req.user.id;
        lesson.rejectedAt = new Date();
        lesson.rejectionReason = reason;
        lesson.isActive = false;

        await lesson.save();

        res.json({
            success: true,
            message: 'Từ chối bài học thành công',
            data: lesson
        });
    } catch (error) {
        console.error('Error rejecting lesson:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi từ chối bài học',
            error: error.message
        });
    }
};

// Xuất bản bài học (hiển thị cho học viên)
export const publishLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài học'
            });
        }

        if (lesson.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể xuất bản bài học đã được duyệt'
            });
        }

        lesson.isPublished = true;
        lesson.publishedAt = new Date();
        await lesson.save();

        res.json({
            success: true,
            message: 'Xuất bản bài học thành công',
            data: lesson
        });
    } catch (error) {
        console.error('Error publishing lesson:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất bản bài học',
            error: error.message
        });
    }
};

// Hủy xuất bản
export const unpublishLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài học'
            });
        }

        lesson.isPublished = false;
        await lesson.save();

        res.json({
            success: true,
            message: 'Hủy xuất bản bài học thành công',
            data: lesson
        });
    } catch (error) {
        console.error('Error unpublishing lesson:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy xuất bản bài học',
            error: error.message
        });
    }
};

// Thống kê bài học
export const getLessonStats = async (req, res) => {
    try {
        const [
            totalLessons,
            pendingLessons,
            approvedLessons,
            publishedLessons,
            rejectedLessons
        ] = await Promise.all([
            Lesson.countDocuments(),
            Lesson.countDocuments({ status: 'pending' }),
            Lesson.countDocuments({ status: 'approved' }),
            Lesson.countDocuments({ isPublished: true }),
            Lesson.countDocuments({ status: 'rejected' })
        ]);

        // Thống kê theo level
        const lessonsByLevel = await Lesson.aggregate([
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Thống kê theo tháng
        const lessonsByMonth = await Lesson.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    total: totalLessons,
                    pending: pendingLessons,
                    approved: approvedLessons,
                    published: publishedLessons,
                    rejected: rejectedLessons
                },
                byLevel: lessonsByLevel,
                byMonth: lessonsByMonth
            }
        });
    } catch (error) {
        console.error('Error getting lesson stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê bài học',
            error: error.message
        });
    }
};