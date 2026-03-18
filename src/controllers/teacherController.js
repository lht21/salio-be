// controllers/teacherController.js
import { Lesson, Vocabulary, Grammar, Listening, Reading, Writing } from '../models/index.js';

// Tạo bài học mới (status: pending)
export const createLesson = async (req, res) => {
    try {
        const { title, level, description, thumbnail, order, estimatedDuration, isPremium } = req.body;
        
        const lesson = new Lesson({
            title,
            level,
            description,
            thumbnail,
            order,
            estimatedDuration,
            isPremium: isPremium || false,
            author: req.user.id,
            status: 'pending', // Chờ admin duyệt
            isPublished: false,
            isActive: false
        });

        await lesson.save();
        
        res.status(201).json({
            success: true,
            message: 'Tạo bài học thành công. Chờ admin duyệt.',
            data: lesson
        });
    } catch (error) {
        console.error('Error creating lesson:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo bài học',
            error: error.message
        });
    }
};

// Lấy danh sách bài học của giáo viên
export const getMyLessons = async (req, res) => {
    try {
        const { status, level, page = 1, limit = 10 } = req.query;
        const query = { author: req.user.id };
        
        if (status) query.status = status;
        if (level) query.level = level;

        const lessons = await Lesson.find(query)
            .populate('author', 'fullName email')
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

// Cập nhật bài học (chỉ khi status = pending hoặc rejected)
export const updateLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findOne({
            _id: req.params.id,
            author: req.user.id
        });

        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài học'
            });
        }

        // Chỉ cho phép edit khi pending hoặc rejected
        if (!['pending', 'rejected'].includes(lesson.status)) {
            return res.status(400).json({
                success: false,
                message: 'Không thể chỉnh sửa bài học đã được duyệt'
            });
        }

        Object.assign(lesson, req.body);
        lesson.status = 'pending'; // Reset về pending sau khi edit
        await lesson.save();

        res.json({
            success: true,
            message: 'Cập nhật bài học thành công',
            data: lesson
        });
    } catch (error) {
        console.error('Error updating lesson:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật bài học',
            error: error.message
        });
    }
};

// Xóa bài học (chỉ khi status = pending)
export const deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findOne({
            _id: req.params.id,
            author: req.user.id,
            status: 'pending'
        });

        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài học hoặc bài học đã được duyệt'
            });
        }

        await lesson.deleteOne();
        res.json({
            success: true,
            message: 'Xóa bài học thành công'
        });
    } catch (error) {
        console.error('Error deleting lesson:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa bài học',
            error: error.message
        });
    }
};

// Thêm skill vào bài học
export const addSkillToLesson = async (req, res) => {
    try {
        const { skillType, skillId } = req.body;
        const validSkills = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
        
        if (!validSkills.includes(skillType)) {
            return res.status(400).json({
                success: false,
                message: 'Loại kỹ năng không hợp lệ'
            });
        }

        const lesson = await Lesson.findOne({
            _id: req.params.id,
            author: req.user.id
        });

        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài học'
            });
        }

        // Kiểm tra skill có tồn tại không
        const skillModels = {
            vocabulary: Vocabulary,
            grammar: Grammar,
            listening: Listening,
            speaking: SpeakingExercise,
            reading: Reading,
            writing: Writing
        };

        const skillExists = await skillModels[skillType].findById(skillId);
        if (!skillExists) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nội dung kỹ năng'
            });
        }

        // Thêm skill vào lesson (tránh duplicate)
        if (!lesson[skillType].includes(skillId)) {
            lesson[skillType].push(skillId);
            lesson.status = 'pending'; // Reset về pending
            await lesson.save();
        }

        res.json({
            success: true,
            message: 'Thêm nội dung kỹ năng thành công',
            data: lesson
        });
    } catch (error) {
        console.error('Error adding skill to lesson:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thêm nội dung kỹ năng',
            error: error.message
        });
    }
};

// Xóa skill khỏi bài học
export const removeSkillFromLesson = async (req, res) => {
    try {
        const { lessonId, skillType, skillId } = req.params;
        
        const lesson = await Lesson.findOne({
            _id: lessonId,
            author: req.user.id
        });

        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài học'
            });
        }

        lesson[skillType].pull(skillId);
        lesson.status = 'pending'; // Reset về pending
        await lesson.save();

        res.json({
            success: true,
            message: 'Xóa nội dung kỹ năng thành công',
            data: lesson
        });
    } catch (error) {
        console.error('Error removing skill from lesson:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa nội dung kỹ năng',
            error: error.message
        });
    }
};