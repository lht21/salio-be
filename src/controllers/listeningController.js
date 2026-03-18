// controllers/listeningController.js
import mongoose from 'mongoose';
import Listening from '../models/Listening.js';
import Lesson from '../models/Lesson.js';
import LessonProgress from '../models/LessonProgress.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ============================
// MULTER UPLOAD CONFIGURATION
// ============================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/audio';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'listening-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file audio!'), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
        fileSize: 50 * 1024 * 1024 // Tăng lên 50MB (thay vì 10MB)
});

// ============================
// GET ALL LISTENINGS
// ============================
export const getListenings = async (req, res) => {
    try {
        const { 
            level, 
            difficulty, 
            search, 
            page = 1, 
            limit = 20,
            lesson,
            tags
        } = req.query;

        let query = { isActive: true };

        if (level) {
            query.level = level;
        }
        
        if (difficulty) {
            query.difficulty = difficulty;
        }
        
        if (lesson) {
            query.lesson = lesson;
        }
        
        if (tags) {
            query.tags = { $in: tags.split(',') };
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { transcript: { $regex: search, $options: 'i' } },
                { translation: { $regex: search, $options: 'i' } },
            ];
        }

        const listenings = await Listening.find(query)
            .populate('author', 'name email')
            .populate('lesson', 'title code level')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Listening.countDocuments(query);

        res.json({
            listenings,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });

    } catch (error) {
        console.error('❌ [getListenings] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// GET LISTENING BY ID
// ============================
export const getListeningById = async (req, res) => {
    try {
        const listening = await Listening.findById(req.params.id)
            .populate('author', 'name email')
            .populate('lesson', 'title code level');

        if (!listening) {
            return res.status(404).json({ message: 'Bài nghe không tồn tại' });
        }

        listening.playCount = (listening.playCount || 0) + 1;
        await listening.save();

        res.json(listening);

    } catch (error) {
        console.error('❌ [getListeningById] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// CREATE NEW LISTENING
// ============================
export const createListening = async (req, res) => {
    try {
        const {
            title, 
            audioUrl, 
            transcript, 
            translation,
            level, 
            duration, 
            questions, 
            difficulty, 
            tags, 
            lesson
        } = req.body;

        console.log('📥 [createListening] Received data:', req.body);

        if (!title || !audioUrl || !transcript || !translation || !level || !duration) {
            return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' });
        }

        if (lesson) {
            const existingListening = await Listening.findOne({ 
                title, 
                lesson 
            });
            
            if (existingListening) {
                return res.status(400).json({ message: 'Bài nghe đã tồn tại trong bài học này' });
            }
        }

        const listening = new Listening({
            title: title.trim(),
            audioUrl,
            transcript: transcript.trim(),
            translation: translation.trim(),
            level,
            duration: parseInt(duration),
            difficulty: difficulty || 'Trung bình',
            tags: tags || [],
            questions: questions || [],
            lesson: lesson || null,
            author: req.userId
        });

        const savedListening = await listening.save();
        
        if (lesson) {
            await Lesson.findByIdAndUpdate(
                lesson,
                { $addToSet: { listening: savedListening._id } }
            );
        }

        await savedListening.populate('lesson', 'title code level');
        
        console.log('✅ [createListening] Listening created:', savedListening._id);
        res.status(201).json(savedListening);

    } catch (error) {
        console.error('❌ [createListening] Error:', error);
        res.status(400).json({ message: error.message });
    }
};

// ============================
// UPLOAD AUDIO FILE
// ============================
export const uploadListening = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Không có file được tải lên' });
        }

        const protocol = req.protocol;
        const host = req.get('host');
        const fullAudioUrl = `${protocol}://${host}/uploads/audio/${req.file.filename}`;

        res.json({
            message: 'Upload file audio thành công',
            audioUrl: fullAudioUrl,
            filename: req.file.filename
        });

    } catch (error) {
        console.error('❌ [uploadListening] Error:', error);
        res.status(400).json({ message: error.message });
    }
};

// ============================
// UPDATE LISTENING
// ============================
export const updateListening = async (req, res) => {
    try {
        const listening = await Listening.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('lesson', 'title code level');

        if (!listening) {
            return res.status(404).json({ message: 'Bài nghe không tồn tại' });
        }

        console.log('✅ [updateListening] Listening updated:', listening._id);
        res.json(listening);

    } catch (error) {
        console.error('❌ [updateListening] Error:', error);
        res.status(400).json({ message: error.message });
    }
};

// ============================
// DELETE LISTENING
// ============================
export const deleteListening = async (req, res) => {
    try {
        const listening = await Listening.findByIdAndDelete(req.params.id);

        if (!listening) {
            return res.status(404).json({ message: 'Bài nghe không tồn tại' });
        }

        if (listening.audioUrl) {
            try {
                const filename = listening.audioUrl.split('/').pop();
                const audioPath = path.join(process.cwd(), 'uploads', 'audio', filename);
                
                if (fs.existsSync(audioPath)) {
                    fs.unlinkSync(audioPath);
                    console.log('✅ Đã xóa file audio:', filename);
                }
            } catch (fileError) {
                console.error('⚠️ Lỗi khi xóa file audio:', fileError);
            }
        }

        if (listening.lesson) {
            await Lesson.findByIdAndUpdate(
                listening.lesson,
                { $pull: { listening: req.params.id } }
            );
        }

        console.log('✅ [deleteListening] Permanently deleted:', req.params.id);
        res.json({ message: 'Đã xóa bài nghe vĩnh viễn khỏi CSDL' });

    } catch (error) {
        console.error('❌ [deleteListening] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// ADD QUESTION TO LISTENING
// ============================
export const addQuestion = async (req, res) => {
    try {
        const { question, options, answer, explanation } = req.body;

        if (!question || !options || options.length < 2 || answer == null) {
            return res.status(400).json({ message: 'Câu hỏi không hợp lệ' });
        }

        const listening = await Listening.findById(req.params.id);
        if (!listening) {
            return res.status(404).json({ message: 'Bài nghe không tồn tại' });
        }

        listening.questions.push({ 
            question, 
            options, 
            answer, 
            explanation 
        });
        
        await listening.save();

        res.json(listening);

    } catch (error) {
        console.error('❌ [addQuestion] Error:', error);
        res.status(400).json({ message: error.message });
    }
};

// ============================
// UPDATE QUESTION
// ============================
export const updateQuestion = async (req, res) => {
    try {
        const { id, questionId } = req.params;

        const listening = await Listening.findById(id);
        if (!listening) {
            return res.status(404).json({ message: 'Bài nghe không tồn tại' });
        }

        const question = listening.questions.id(questionId);
        if (!question) {
            return res.status(404).json({ message: 'Câu hỏi không tồn tại' });
        }

        Object.assign(question, req.body);
        await listening.save();

        res.json(listening);

    } catch (error) {
        console.error('❌ [updateQuestion] Error:', error);
        res.status(400).json({ message: error.message });
    }
};

// ============================
// DELETE QUESTION
// ============================
export const deleteQuestion = async (req, res) => {
    try {
        const { id, questionId } = req.params;

        const listening = await Listening.findById(id);
        if (!listening) {
            return res.status(404).json({ message: 'Bài nghe không tồn tại' });
        }

        listening.questions.id(questionId).deleteOne();
        await listening.save();

        res.json(listening);

    } catch (error) {
        console.error('❌ [deleteQuestion] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// GET LISTENINGS BY LESSON
// ============================
export const getListeningsByLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;

        console.log('🔍 [getListeningsByLesson] Lesson ID:', lessonId);

        // Kiểm tra ID hợp lệ
        if (!lessonId) {
             return res.status(400).json({ success: false, message: 'Lesson ID không hợp lệ' });
        }

        // CÁCH: Dùng Populate (Tương tự getReadingsByLesson)
        // Tìm Lesson, sau đó populate field 'listening' (hoặc 'listenings' tùy schema của bạn)
        const lesson = await Lesson.findById(lessonId).populate({
            path: 'listening', // ⚠️ LƯU Ý: Kiểm tra lại trong Lesson Model xem field này tên là 'listening' hay 'listenings'
            // Chỉ lấy các trường cần thiết, ẩn đáp án để bảo mật
            // Giữ lại transcript nếu muốn hiện sau khi nộp bài, hoặc ẩn đi tùy logic
            select: '-questions.answer -questions.explanation' 
        });

        if (!lesson) {
            return res.status(404).json({ 
                success: false, 
                message: 'Bài học không tồn tại' 
            });
        }

        // Trả về dữ liệu chuẩn format { success, data }
        return res.status(200).json({
            success: true,
            data: lesson.listening || [] 
        });

    } catch (error) {
        console.error('❌ [getListeningsByLesson] Error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi tải bài nghe' });
    }
};

// ============================
// CREATE LISTENING FOR LESSON
// ============================
export const createListeningForLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const listeningData = req.body;

        console.log('📥 [createListeningForLesson] Received data:', listeningData);
        console.log('📥 [createListeningForLesson] Lesson ID:', lessonId);

        if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
            return res.status(400).json({ message: 'Lesson ID không hợp lệ' });
        }

        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Bài học không tồn tại' });
        }

        console.log('✅ [createListeningForLesson] Lesson found:', lesson.title);

        if (!listeningData.title || !listeningData.audioUrl || 
            !listeningData.transcript || !listeningData.translation || 
            !listeningData.level || !listeningData.duration) {
            return res.status(400).json({ 
                message: 'Thiếu dữ liệu bắt buộc: title, audioUrl, transcript, translation, level, duration' 
            });
        }

        const existingListening = await Listening.findOne({
            title: listeningData.title,
            lesson: lessonId
        });

        if (existingListening) {
            return res.status(400).json({ 
                message: 'Bài nghe đã tồn tại trong bài học này' 
            });
        }

        const listening = new Listening({
            title: listeningData.title.trim(),
            audioUrl: listeningData.audioUrl,
            transcript: listeningData.transcript.trim(),
            translation: listeningData.translation.trim(),
            level: listeningData.level,
            duration: parseInt(listeningData.duration),
            difficulty: listeningData.difficulty || 'Trung bình',
            tags: listeningData.tags || [],
            questions: listeningData.questions || [],
            lesson: lessonId,
            author: req.userId
        });

        console.log('💾 [createListeningForLesson] Saving listening...');

        const savedListening = await listening.save();
        console.log('✅ [createListeningForLesson] Listening saved:', savedListening._id);

        if (!lesson.listening) {
            lesson.listening = [];
        }
        lesson.listening.push(savedListening._id);
        
        await lesson.save();
        console.log('✅ [createListeningForLesson] Lesson updated');

        await savedListening.populate('lesson', 'title code level');

        res.status(201).json(savedListening);

    } catch (error) {
        console.error('❌ [createListeningForLesson] Error:', error);
        res.status(400).json({ 
            message: error.message || 'Có lỗi xảy ra khi tạo bài nghe' 
        });
    }
};

// ============================
// SUBMIT LISTENING TEST
// ============================

// POST /api/listening/:listeningId/submit
export const submitListening = async (req, res) => {
    try {
        const { listeningId } = req.params; // Lưu ý: route nên là /:listeningId/submit


       
        const { answers, lessonId } = req.body; 
        const userId = req.user._id;

        // 1. Validation đầu vào
        if (!answers || typeof answers !== 'object') {
             return res.status(400).json({ success: false, message: 'Dữ liệu câu trả lời không hợp lệ' });
        }

        // 2. Lấy đề bài
        const listening = await Listening.findById(listeningId);
        if (!listening) {
            console.log("❌ Không tìm thấy bài nghe trong DB với ID này.");
            return res.status(404).json({ success: false, message: 'Bài nghe không tồn tại' });
        }

        // 3. Chấm điểm logic
        let correctCount = 0;
        const totalQuestions = listening.questions.length;
        
        // Map qua câu hỏi gốc để đảm bảo tính chính xác
        const results = listening.questions.map(q => {
            const questionIdStr = q._id.toString();
            // Lấy đáp án user (answers dạng { "questionId": index })
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

        // --- BONUS: Cập nhật thống kê chung cho bài Listening (Giữ lại tính năng của code cũ) ---
        // Phần này giúp Admin biết bài nào khó/dễ dựa trên lượt làm của mọi người
        listening.attemptCount = (listening.attemptCount || 0) + 1;
        // Tính lại điểm trung bình cộng dồn
        listening.averageScore = Math.round(
            (((listening.averageScore || 0) * (listening.attemptCount - 1)) + score) / listening.attemptCount
        );
        await listening.save(); 
        // ---------------------------------------------------------------------------------------

        // 4. Cập nhật LessonProgress (Cốt lõi)
        if (lessonId) {
            let progress = await LessonProgress.findOne({ user: userId, lesson: lessonId });
            
            const statusData = {
                exerciseId: listeningId,
                score: score,
                isCompleted: true,
                completedAt: new Date()
            };

            if (!progress) {
                // Tạo mới nếu chưa có
                progress = new LessonProgress({
                    user: userId,
                    lesson: lessonId,
                    listeningStatus: [statusData], // Lưu vào listeningStatus
                    lastAccessed: new Date(),
                });
            } else {
                // Cập nhật mảng listeningStatus
                const existingIndex = progress.listeningStatus.findIndex(
                    item => item.exerciseId.toString() === listeningId
                );

                if (existingIndex > -1) {
                    progress.listeningStatus[existingIndex] = statusData;
                } else {
                    progress.listeningStatus.push(statusData);
                }
            }
            
            // Báo cho Mongoose biết mảng đã thay đổi (quan trọng khi update phần tử mảng)
            progress.markModified('listeningStatus');
            await progress.save();
        }

        // 5. Trả kết quả
        return res.status(200).json({
            success: true,
            message: 'Nộp bài nghe thành công',
            data: {
                score,
                correctCount,
                totalQuestions,
                results,
                passed: score >= 50 
            }
        });

    } catch (error) {
        console.error('Error grading listening:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi chấm điểm' });
    }
};

// ============================
// GET USER PROGRESS
// ============================
export const getListeningProgress = async (req, res) => {
    try {
        res.json({
            message: 'Progress tracking will be implemented in the future'
        });

    } catch (error) {
        console.error('❌ [getListeningProgress] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// GET LISTENING STATS
// ============================
export const getListeningStats = async (req, res) => {
    try {
        const stats = await Listening.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$level',
                    count: { $sum: 1 },
                    totalPlays: { $sum: { $ifNull: ['$playCount', 0] } },
                    totalAttempts: { $sum: { $ifNull: ['$attemptCount', 0] } },
                    averageScore: { $avg: { $ifNull: ['$averageScore', 0] } },
                }
            },
            {
                $project: {
                    level: '$_id',
                    count: 1,
                    totalPlays: 1,
                    totalAttempts: 1,
                    averageScore: { $round: ['$averageScore', 2] },
                    _id: 0
                }
            },
            { $sort: { level: 1 } }
        ]);

        res.json(stats);

    } catch (error) {
        console.error('❌ [getListeningStats] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// GET ALL TAGS
// ============================
export const getTags = async (req, res) => {
    try {
        const tags = await Listening.distinct('tags', { isActive: true });
        res.json(tags.filter(t => t).sort());

    } catch (error) {
        console.error('❌ [getTags] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ============================
// BULK CREATE LISTENINGS
// ============================
export const bulkCreateListenings = async (req, res) => {
    try {
        const { listenings, lessonId } = req.body;

        if (!Array.isArray(listenings) || !listenings.length) {
            return res.status(400).json({ message: 'Danh sách bài nghe không hợp lệ' });
        }

        let lesson = null;
        if (lessonId) {
            if (!mongoose.Types.ObjectId.isValid(lessonId)) {
                return res.status(400).json({ message: 'Lesson ID không hợp lệ' });
            }
            
            lesson = await Lesson.findById(lessonId);
            if (!lesson) {
                return res.status(404).json({ message: 'Bài học không tồn tại' });
            }
        }

        const result = { 
            success: [], 
            errors: [] 
        };

        for (const item of listenings) {
            try {
                if (!item.title || !item.audioUrl || !item.transcript || !item.translation || !item.level || !item.duration) {
                    result.errors.push({ 
                        title: item.title || 'Không có tiêu đề', 
                        error: 'Thiếu dữ liệu bắt buộc' 
                    });
                    continue;
                }

                if (lessonId) {
                    const existing = await Listening.findOne({ 
                        title: item.title, 
                        lesson: lessonId 
                    });
                    
                    if (existing) {
                        result.errors.push({ 
                            title: item.title, 
                            error: 'Đã tồn tại trong bài học này' 
                        });
                        continue;
                    }
                }

                const listening = new Listening({
                    title: item.title.trim(),
                    audioUrl: item.audioUrl,
                    transcript: item.transcript.trim(),
                    translation: item.translation.trim(),
                    level: item.level,
                    duration: parseInt(item.duration),
                    difficulty: item.difficulty || 'Trung bình',
                    tags: item.tags || [],
                    questions: item.questions || [],
                    lesson: lessonId || null,
                    author: req.userId
                });

                const saved = await listening.save();
                
                if (lessonId && lesson) {
                    lesson.listening.push(saved._id);
                }

                result.success.push({
                    title: item.title,
                    id: saved._id
                });

            } catch (err) {
                result.errors.push({ 
                    title: item.title || 'Không có tiêu đề', 
                    error: err.message 
                });
            }
        }

        if (lessonId && lesson) {
            await lesson.save();
        }

        res.json(result);

    } catch (error) {
        console.error('❌ [bulkCreateListenings] Error:', error);
        res.status(400).json({ message: error.message });
    }
};