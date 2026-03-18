import Lesson from '../models/Lesson.js';

// GET /api/lessons - Lấy tất cả bài học
export const getLessons = async (req, res) => {
    try {
        const { level, search, page = 1, limit = 10 } = req.query;
        
        let query = { isActive: true };
        
        if (level) {
            query.level = level;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        const lessons = await Lesson.find(query)
            .populate('author', 'name email')
            .populate('vocabulary', 'koreanWord vietnameseMeaning level')
            .sort({ level: 1, order: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Lesson.countDocuments(query);

        res.json({
            lessons,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/lessons - Lấy danh sách bài học dành cho người học (Student View)
export const getLessonsForStudent = async (req, res) => {
    try {
        const { level, search, page = 1, limit = 10 } = req.query;
        
        // Điều kiện lọc cơ bản cho người học
        let query = { 
            isActive: true,       // Bài học đang hoạt động
            isPublished: true,    // Bài học đã được xuất bản
            status: 'approved'    // Bài học đã được duyệt nội dung
        };
        
        // Lọc theo cấp độ (Level)
        if (level) {
            query.level = level;
        }
        
        // Tìm kiếm theo từ khóa (Title hoặc Code)
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        const lessons = await Lesson.find(query)
            .populate('author', 'name email') // Lấy thông tin tác giả cơ bản
            // .populate('vocabulary') // Cân nhắc bỏ populate chi tiết ở danh sách tổng để tăng tốc độ
            .select('-rejectionReason -rejectedBy -rejectedAt -adminNote') // Ẩn các trường nội bộ không cần thiết cho student
            .sort({ level: 1, order: 1 }) // Sắp xếp theo level rồi đến thứ tự bài
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Lesson.countDocuments(query);

        res.json({
            lessons,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/lessons/:id - Lấy bài học theo ID
export const getLessonById = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id)
            .populate('author', 'name email')
            .populate('vocabulary')
            .populate('grammar')
            .populate('listening')
            .populate('speaking')
            .populate('reading')
            .populate('writing');

        if (!lesson) {
            return res.status(404).json({ message: 'Bài học không tồn tại' });
        }

        res.json(lesson);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/lessons - Tạo bài học mới
export const createLesson = async (req, res) => {
    try {
        const { code, title, level, description, order, isPremium, estimatedDuration, vocabulary } = req.body;
        
        console.log('🔍 [Backend] Request body:', req.body);
        console.log('🔍 [Backend] User ID from auth:', req.userId); // THÊM LOG NÀY
        
        const existingLesson = await Lesson.findOne({ code, level });
        if (existingLesson) {
            return res.status(400).json({ message: 'Mã bài học đã tồn tại trong level này' });
        }

        // SỬA LỖI Ở ĐÂY: SỬ DỤNG req.userId THAY VÌ finalAuthor
        const lesson = new Lesson({
            code,
            title,
            level,
            description,
            order: order || 0,
            isPremium: isPremium || false,
            estimatedDuration: estimatedDuration || 60,
            author: req.userId, // <-- SỬA THÀNH req.userId
            vocabulary: vocabulary || []
        });

        console.log('🔍 [Backend] Lesson to save:', lesson);

        const savedLesson = await lesson.save();
        await savedLesson.populate('author', 'name email');
        
        res.status(201).json(savedLesson);
    } catch (error) {
        console.error('❌ [Backend] Error creating lesson:', error);
        res.status(400).json({ message: error.message });
    }
};

// PUT /api/lessons/:id - Cập nhật bài học
export const updateLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        )
        .populate('author', 'name email')
        .populate('vocabulary');

        if (!lesson) {
            return res.status(404).json({ message: 'Bài học không tồn tại' });
        }

        res.json(lesson);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// DELETE /api/lessons/:id/hard-delete - Xóa bài học cứng
export const deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findByIdAndDelete(req.params.id);

        if (!lesson) {
            return res.status(404).json({ message: 'Bài học không tồn tại' });
        }

        res.json({ message: 'Đã xóa bài học thành công vĩnh viễn' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/lessons/delete-multiple-hard - Xóa cứng nhiều bài học
export const deleteMultipleLessons = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ message: 'Danh sách ID không hợp lệ' });
        }

        const result = await Lesson.deleteMany(
            { _id: { $in: ids } }
        );

        res.json({ 
            message: `Đã xóa bài học thành công vĩnh viễn`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// tiến độ học từ vựng 
export const updateVocabProgress = async (req, res) => {
  try {
    const { lessonId, vocabId, status } = req.body; // status: 'mastered' hoặc 'unlearned'
    const userId = req.user._id;

    let progress = await LessonProgress.findOne({ user: userId, lesson: lessonId });

    if (!progress) {
      progress = await LessonProgress.create({ user: userId, lesson: lessonId, vocabularyStatus: [] });
    }

    const vocabIndex = progress.vocabularyStatus.findIndex(
      (v) => v.vocabularyId.toString() === vocabId
    );

    if (vocabIndex > -1) {
      progress.vocabularyStatus[vocabIndex].status = status;
      progress.vocabularyStatus[vocabIndex].lastReviewed = Date.now();
    } else {
      progress.vocabularyStatus.push({ vocabularyId: vocabId, status });
    }

    await progress.save();
    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/lessons/my - Lấy bài học của user hiện tại
export const getMyLessons = async (req, res) => {
  try {
    const { level, status, page = 1, limit = 20 } = req.query;

    const query = {
      author: req.user._id 
    };

    if (level) query.level = level;
    if (status) query.status = status;

    const lessons = await Lesson.find(query)
      .populate('author', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lesson.countDocuments(query);

    res.json({
      success: true,
      lessons,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('❌ getMyLessons error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bài học của bạn',
      error: error.message
    });
  }
};
