import mongoose from 'mongoose';
import Reading from '../models/Reading.js';
import Lesson from '../models/Lesson.js';
import LessonProgress from '../models/LessonProgress.js';

// ========== CRUD OPERATIONS ==========

// GET /api/readings - Lấy tất cả bài đọc (có filter, pagination)
export const getReadings = async (req, res) => {
    try {
        const { 
            level, 
            difficulty, 
            search, 
            page = 1, 
            limit = 10 
        } = req.query;
        
        let query = { isActive: true };
        
        // Filter by level
        if (level) {
            query.level = level;
        }
        
        // Filter by difficulty
        if (difficulty) {
            query.difficulty = difficulty;
        }
        
        // Search by title, content or tags
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { translation: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const readings = await Reading.find(query)
            .populate('author', 'name email')
            .populate('lesson', 'title code level')
            .sort({ level: 1, createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Reading.countDocuments(query);

        res.json({
            readings,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/readings/:id - Lấy bài đọc theo ID
export const getReadingById = async (req, res) => {
    try {
        const reading = await Reading.findById(req.params.id)
            .populate('author', 'name email')
            .populate('lesson', 'title code level');

        if (!reading) {
            return res.status(404).json({ message: 'Bài đọc không tồn tại' });
        }

        // Tăng view count
        reading.viewCount += 1;
        await reading.save();

        res.json(reading);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/readings - Tạo bài đọc mới
export const createReading = async (req, res) => {
    try {
        const { 
            title, 
            content, 
            translation, 
            level, 
            questions, 
            difficulty, 
            tags,
            lesson 
        } = req.body;
        
        // Validate required fields
        if (!title || !content || !translation || !level) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
        }

        // Validate questions if provided
        if (questions && Array.isArray(questions)) {
            for (const question of questions) {
                if (!question.question || !Array.isArray(question.options) || 
                    question.options.length < 2 || typeof question.answer !== 'number') {
                    return res.status(400).json({ message: 'Câu hỏi không hợp lệ' });
                }
                
                // Xóa _id nếu không phải ObjectId hợp lệ
                if (question._id && !mongoose.Types.ObjectId.isValid(question._id)) {
                    delete question._id;
                }
            }
        }

        const reading = new Reading({
            title,
            content,
            translation,
            level,
            questions: questions || [],
            difficulty: difficulty || 'Trung bình',
            tags: tags || [],
            lesson,
            author: req.userId
        });

        const savedReading = await reading.save();

                // Nếu bài đọc được tạo có gắn với Lesson, hãy update Lesson đó
        if (lesson) {
            await Lesson.findByIdAndUpdate(
                lesson,
                { $addToSet: { reading: savedReading._id } }, // Lưu ý: check kỹ tên field là 'reading' hay 'readings'
                { new: true }
            );
            console.log('✅ [createReading] Updated Lesson with new Reading ref');
        }

        await savedReading.populate('author', 'name email');
        
        res.status(201).json(savedReading);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// PUT /api/readings/:id - Cập nhật bài đọc
export const updateReading = async (req, res) => {
    try {
        const reading = await Reading.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('author', 'name email')
         .populate('lesson', 'title code level');

        if (!reading) {
            return res.status(404).json({ message: 'Bài đọc không tồn tại' });
        }

        res.json(reading);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// DELETE /api/readings/:id - Xóa bài đọc (HARD DELETE)
export const deleteReading = async (req, res) => {
  try {
    const reading = await Reading.findByIdAndDelete(req.params.id); 
    
    if (!reading) {
      return res.status(404).json({ message: 'Bài đọc không tồn tại' });
    }

    // QUAN TRỌNG: Xóa reference trong lesson
    if (reading.lesson) {
      await Lesson.findByIdAndUpdate(
        reading.lesson,
        { $pull: { reading: req.params.id } } // field trong Lesson là "reading" (số ít)
      );
      console.log('✅ [deleteReading] Removed reference from lesson:', reading.lesson);
    }

    res.json({ 
      message: 'Đã xóa bài đọc thành công',
      deletedReading: reading 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== LESSON-RELATED OPERATIONS ==========

// POST /api/readings/lesson/:lessonId - Tạo bài đọc cho bài học
export const createReadingForLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const readingData = req.body;

        console.log('📥 [createReadingForLesson] Received data:', readingData);

        // Kiểm tra lessonId hợp lệ
        if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
            return res.status(400).json({ message: 'Lesson ID không hợp lệ' });
        }

        // Kiểm tra lesson tồn tại
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Bài học không tồn tại' });
        }

        console.log('✅ [createReadingForLesson] Lesson found:', lesson.title);

        // Validate required fields
        if (!readingData.title || !readingData.content || !readingData.translation) {
            return res.status(400).json({ 
                message: 'Tiêu đề, nội dung và bản dịch là bắt buộc' 
            });
        }

        // Kiểm tra bài đọc đã tồn tại trong bài học chưa (theo tiêu đề)
        const existingReading = await Reading.findOne({
            title: readingData.title,
            lesson: lessonId
        });

        if (existingReading) {
            return res.status(400).json({ 
                message: 'Bài đọc đã tồn tại trong bài học này' 
            });
        }

        // Tạo bài đọc mới
        const reading = new Reading({
            title: readingData.title.trim(),
            content: readingData.content.trim(),
            translation: readingData.translation.trim(),
            level: readingData.level || lesson.level || 'Sơ cấp 1',
            difficulty: readingData.difficulty || 'Trung bình',
            tags: readingData.tags || [],
            questions: readingData.questions || [],
            lesson: lessonId,
            author: req.userId
        });

        console.log('💾 [createReadingForLesson] Saving reading...');
        const savedReading = await reading.save();
        console.log('✅ [createReadingForLesson] Reading saved:', savedReading._id);

        // QUAN TRỌNG: Thêm reference vào lesson
        // ✅ field trong Lesson là "reading" (số ít), không phải "readings"
        await Lesson.findByIdAndUpdate(
            lessonId,
            { 
                $addToSet: { reading: savedReading._id } // reading, không phải readings
            },
            { new: true }
        );
        console.log('✅ [createReadingForLesson] Lesson updated with reading reference');

        // Populate để trả về đầy đủ thông tin
        await savedReading.populate('author', 'name email');
        await savedReading.populate('lesson', 'title code level');

        res.status(201).json(savedReading);

    } catch (error) {
        console.error('❌ [createReadingForLesson] Error:', error);
        res.status(400).json({ 
            message: error.message || 'Có lỗi xảy ra khi tạo bài đọc' 
        });
    }
};

// GET /api/readings/lesson/:lessonId - Lấy bài đọc theo bài học
export const getReadingsByLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        
        // CÁCH 1: Dùng Populate (Chuẩn nhất với Schema của bạn)
        // Tìm Lesson, sau đó populate field 'reading' để lấy chi tiết bài đọc
        const lesson = await Lesson.findById(lessonId).populate({
            path: 'reading',
            // Chỉ lấy các trường cần thiết, ẩn đáp án để bảo mật
            select: '-questions.answer -questions.explanation' 
        });

        if (!lesson) {
            return res.status(404).json({ 
                success: false, 
                message: 'Bài học không tồn tại' 
            });
        }

        // Trả về mảng reading đã được populate
        return res.status(200).json({
            success: true,
            readings: lesson.reading || [] 
        });

    } catch (error) {
        console.error('Error fetching readings:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ========== QUESTION OPERATIONS ==========

// POST /api/readings/:id/questions - Thêm câu hỏi vào bài đọc
export const addQuestion = async (req, res) => {
    try {
        const { question, options, answer, explanation } = req.body;
        
        if (!question || !Array.isArray(options) || options.length < 2 || 
            typeof answer !== 'number' || answer < 0 || answer >= options.length) {
            return res.status(400).json({ message: 'Dữ liệu câu hỏi không hợp lệ' });
        }

        const reading = await Reading.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    questions: {
                        question,
                        options,
                        answer,
                        explanation
                    }
                }
            },
            { new: true }
        );

        if (!reading) {
            return res.status(404).json({ message: 'Bài đọc không tồn tại' });
        }

        res.json(reading);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// PUT /api/readings/:id/questions/:questionId - Cập nhật câu hỏi
export const updateQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { question, options, answer, explanation } = req.body;

        const reading = await Reading.findOneAndUpdate(
            { 
                _id: req.params.id, 
                'questions._id': questionId 
            },
            {
                $set: {
                    'questions.$.question': question,
                    'questions.$.options': options,
                    'questions.$.answer': answer,
                    'questions.$.explanation': explanation
                }
            },
            { new: true }
        );

        if (!reading) {
            return res.status(404).json({ message: 'Bài đọc hoặc câu hỏi không tồn tại' });
        }

        res.json(reading);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// DELETE /api/readings/:id/questions/:questionId - Xóa câu hỏi
export const deleteQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;

        const reading = await Reading.findByIdAndUpdate(
            req.params.id,
            {
                $pull: {
                    questions: { _id: questionId }
                }
            },
            { new: true }
        );

        if (!reading) {
            return res.status(404).json({ message: 'Bài đọc không tồn tại' });
        }

        res.json(reading);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ========== OTHER OPERATIONS ==========


// POST /api/readings/:readingId/submit - Nộp bài làm
export const submitReadingExercise = async (req, res) => {
    try {
        const { readingId } = req.params;
        const { answers, lessonId } = req.body; 
        const userId = req.user._id;

        // 1. Validation đầu vào
        if (!answers || typeof answers !== 'object') {
             return res.status(400).json({ success: false, message: 'Dữ liệu câu trả lời không hợp lệ' });
        }

        // 2. Lấy đề bài
        const reading = await Reading.findById(readingId);
        if (!reading) {
            return res.status(404).json({ success: false, message: 'Bài đọc không tồn tại' });
        }

        // 3. Chấm điểm logic
        let correctCount = 0;
        const totalQuestions = reading.questions.length;
        
        const results = reading.questions.map(q => {
            const questionIdStr = q._id.toString();
            // Kiểm tra xem user có trả lời câu này không, nếu không coi như sai (-1)
            const userAnswer = answers.hasOwnProperty(questionIdStr) ? answers[questionIdStr] : -1;
            const isCorrect = userAnswer === q.answer; 
            
            if (isCorrect) correctCount++;

            return {
                questionId: q._id,
                userAnswer: userAnswer,
                correctAnswer: q.answer,
                isCorrect: isCorrect,
                explanation: q.explanation 
            };
        });

        const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

        // 4. Cập nhật LessonProgress
        if (lessonId) {
            // Tìm tiến độ hiện tại
            let progress = await LessonProgress.findOne({ user: userId, lesson: lessonId });
            
            // Dữ liệu trạng thái bài tập cần lưu
            const statusData = {
                exerciseId: readingId,
                score: score,
                isCompleted: true,
                completedAt: new Date()
            };

            if (!progress) {
                // SỬA: Nếu chưa có tiến độ (VD: vào thẳng link bài tập), TẠO MỚI luôn
                progress = new LessonProgress({
                    user: userId,
                    lesson: lessonId,
                    readingStatus: [statusData],
                    lastAccessed: new Date(),
                    // Các trường khác sẽ theo default của Schema
                });
            } else {
                // Nếu đã có tiến độ, cập nhật mảng readingStatus
                const existingIndex = progress.readingStatus.findIndex(
                    item => item.exerciseId.toString() === readingId
                );

                if (existingIndex > -1) {
                    // SỬA: Dùng splice hoặc set trực tiếp và markModified để đảm bảo Mongoose lưu
                    progress.readingStatus[existingIndex] = statusData;
                } else {
                    progress.readingStatus.push(statusData);
                }
            }
            progress.markModified('readingStatus');
            // Lưu vào DB (Middleware pre('save') sẽ tự chạy để tính lại readingProgress & overallProgress)
            await progress.save();
        }

        // 5. Trả kết quả
        return res.status(200).json({
            success: true,
            message: 'Chấm điểm thành công',
            data: {
                score,
                correctCount,
                totalQuestions,
                results,
                passed: score >= 50 
            }
        });

    } catch (error) {
        console.error('Error grading reading:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi chấm điểm' });
    }
};

// GET /api/readings/stats - Thống kê bài đọc
export const getReadingStats = async (req, res) => {
    try {
        const stats = await Reading.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$level',
                    count: { $sum: 1 },
                    totalViews: { $sum: '$viewCount' },
                    totalAttempts: { $sum: '$attemptCount' },
                    averageScore: { $avg: '$averageScore' },
                    totalQuestions: { $sum: { $size: '$questions' } }
                }
            },
            {
                $project: {
                    level: '$_id',
                    count: 1,
                    totalViews: 1,
                    totalAttempts: 1,
                    averageScore: { $round: ['$averageScore', 2] },
                    totalQuestions: 1,
                    averageQuestions: { $round: [{ $divide: ['$totalQuestions', '$count'] }, 1] },
                    _id: 0
                }
            },
            { $sort: { level: 1 } }
        ]);

        const totalReadings = await Reading.countDocuments({ isActive: true });
        const totalQuestions = await Reading.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, total: { $sum: { $size: '$questions' } } } }
        ]);

        res.json({
            totalReadings,
            totalQuestions: totalQuestions[0]?.total || 0,
            stats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/readings/tags - Lấy danh sách tags
export const getTags = async (req, res) => {
    try {
        const tags = await Reading.distinct('tags', { isActive: true });
        res.json(tags.filter(tag => tag)); // Remove null/undefined
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/readings/bulk-create - Tạo nhiều bài đọc cùng lúc
export const bulkCreateReadings = async (req, res) => {
    try {
        const { readings, lessonId } = req.body;
        
        if (!Array.isArray(readings) || readings.length === 0) {
            return res.status(400).json({ message: 'Danh sách bài đọc không hợp lệ' });
        }

        // Validate lesson exists if provided
        if (lessonId) {
            const lesson = await Lesson.findById(lessonId);
            if (!lesson) {
                return res.status(404).json({ message: 'Bài học không tồn tại' });
            }
        }

        const results = {
            success: [],
            errors: []
        };

        for (const item of readings) {
            try {
                const reading = new Reading({
                    title: item.title,
                    content: item.content,
                    translation: item.translation,
                    level: item.level,
                    questions: item.questions || [],
                    difficulty: item.difficulty || 'Trung bình',
                    tags: item.tags || [],
                    lesson: lessonId,
                    author: req.userId
                });

                const savedReading = await reading.save();
                results.success.push(savedReading.title);
                
            } catch (error) {
                results.errors.push({
                    title: item.title,
                    error: error.message
                });
            }
        }

        res.json({
            message: `Import thành công ${results.success.length} bài đọc, lỗi ${results.errors.length} bài đọc`,
            success: results.success,
            errors: results.errors
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};