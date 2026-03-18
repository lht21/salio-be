// controllers/vocabularyController.js
import mongoose from 'mongoose';
import Vocabulary from '../models/Vocabulary.js';
import Lesson from '../models/Lesson.js';
import LessonProgress from '../models/LessonProgress.js';

// GET /api/vocabulary - Lấy tất cả từ vựng
export const getVocabulary = async (req, res) => {
    try {
        const { 
            level, 
            lesson, 
            category, 
            type, 
            search, 
            page = 1, 
            limit = 20 
        } = req.query;
        
        let query = { isActive: true };
        
        // Filter by level
        if (level) {
            query.level = level;
        }
        
        // Filter by lesson
        if (lesson) {
            query.lesson = lesson;
        }
        
        // Filter by category
        if (category) {
            query.category = category;
        }
        
        // Filter by type
        if (type) {
            query.type = type;
        }
        
        // Search by word or meaning
        if (search) {
            query.$or = [
                { word: { $regex: search, $options: 'i' } },
                { meaning: { $regex: search, $options: 'i' } },
                { pronunciation: { $regex: search, $options: 'i' } }
            ];
        }

        const vocabulary = await Vocabulary.find(query)
            .populate('lesson', 'title code level')
            .sort({ word: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Vocabulary.countDocuments(query);

        res.json({
            vocabulary,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('❌ [getVocabulary] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/vocabulary/:id - Lấy từ vựng theo ID
export const getVocabularyById = async (req, res) => {
    try {
        const vocabulary = await Vocabulary.findById(req.params.id)
            .populate('lesson', 'title code level');

        if (!vocabulary) {
            return res.status(404).json({ message: 'Từ vựng không tồn tại' });
        }

        console.log('✅ [getVocabularyById] Vocabulary found:', vocabulary);
        res.json(vocabulary);
    } catch (error) {
        console.error('❌ [getVocabularyById] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// POST /api/vocabulary - Tạo từ vựng mới
export const createVocabulary = async (req, res) => {
    try {
        const { word, meaning, pronunciation, type, category, examples, level, lesson } = req.body;
        
        console.log('📥 [createVocabulary] Received data:', req.body);

        // Kiểm tra dữ liệu bắt buộc
        if (!word || !meaning) {
            return res.status(400).json({ message: 'Từ vựng và nghĩa là bắt buộc' });
        }

        // Check if vocabulary already exists (nếu có lesson)
        if (lesson) {
            const existingVocabulary = await Vocabulary.findOne({ 
                word, 
                lesson 
            });
            
            if (existingVocabulary) {
                return res.status(400).json({ message: 'Từ vựng đã tồn tại trong bài học này' });
            }
        }

        const vocabulary = new Vocabulary({
            word: word.trim(),
            meaning: meaning.trim(),
            pronunciation: pronunciation?.trim() || '',
            type: type || '명사',
            category: category?.trim() || '',
            examples: examples || [],
            level: level || 'Sơ cấp 1',
            lesson: lesson || null
        });

        const savedVocabulary = await vocabulary.save();
        
        // Nếu có lesson, thêm reference vào lesson
        if (lesson) {
            await Lesson.findByIdAndUpdate(
                lesson,
                { $addToSet: { vocabulary: savedVocabulary._id } }
            );
        }

        await savedVocabulary.populate('lesson', 'title code level');
        
        console.log('✅ [createVocabulary] Vocabulary created:', savedVocabulary._id);
        res.status(201).json(savedVocabulary);
    } catch (error) {
        console.error('❌ [createVocabulary] Error:', error);
        res.status(400).json({ message: error.message });
    }
};

// PUT /api/vocabulary/:id - Cập nhật từ vựng
export const updateVocabulary = async (req, res) => {
    try {
        const vocabulary = await Vocabulary.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('lesson', 'title code level');

        if (!vocabulary) {
            return res.status(404).json({ message: 'Từ vựng không tồn tại' });
        }

        console.log('✅ [updateVocabulary] Vocabulary updated:', vocabulary._id);
        res.json(vocabulary);
    } catch (error) {
        console.error('❌ [updateVocabulary] Error:', error);
        res.status(400).json({ message: error.message });
    }
};

// DELETE /api/vocabulary/:id - Xóa từ vựng (soft delete)
export const deleteVocabulary = async (req, res) => {
    try {
        const vocabulary = await Vocabulary.findByIdAndDelete(req.params.id);

        if (!vocabulary) {
            return res.status(404).json({ message: 'Từ vựng không tồn tại' });
        }

        // Quan trọng: Phải xóa cả ID của từ vựng này trong mảng vocabulary của Lesson
        if (vocabulary.lesson) {
            await Lesson.findByIdAndUpdate(
                vocabulary.lesson,
                { $pull: { vocabulary: req.params.id } } // $pull dùng để rút item khỏi mảng
            );
        }

        console.log('✅ [deleteVocabulary] Permanently deleted:', req.params.id);
        res.json({ message: 'Đã xóa từ vựng vĩnh viễn khỏi CSDL' });
    } catch (error) {
        console.error('❌ [deleteVocabulary] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Lấy danh sách từ vựng theo ID bài học
 * @route   GET /api/vocabulary/lesson/:lessonId
 * @access  Public/Private (Tùy cấu hình)
 */
export const getVocabularyByLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // 1. Tìm bài học và lấy danh sách ID từ vựng từ mảng 'vocabulary'
        const lesson = await Lesson.findById(lessonId).select('vocabulary');
        
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Bài học không tồn tại' });
        }

        // 2. Truy vấn từ vựng dựa trên danh sách ID có trong Lesson
        // Cách này đảm bảo lấy đúng 3 từ vựng bạn thấy trong mảng của Lesson
        const query = {
            _id: { $in: lesson.vocabulary }, // Tìm các ID nằm trong mảng của Lesson
            isActive: { $ne: false }         // Lấy các từ đang hoạt động
        };

        const skip = (page - 1) * limit;

        const [vocabulary, total] = await Promise.all([
            Vocabulary.find(query)
                .sort({ word: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Vocabulary.countDocuments(query)
        ]);

        res.json({
            success: true,
            count: vocabulary.length,
            pagination: {
                totalItems: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit
            },
            data: vocabulary
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// POST /api/vocabulary/lesson/:lessonId - Tạo từ vựng cho bài học
export const createVocabularyForLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const vocabularyData = req.body;

        console.log('📥 [createVocabularyForLesson] Received data:', vocabularyData);
        console.log('📥 [createVocabularyForLesson] Lesson ID:', lessonId);

        // Kiểm tra lessonId hợp lệ
        if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
            return res.status(400).json({ message: 'Lesson ID không hợp lệ' });
        }

        // Kiểm tra lesson tồn tại
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Bài học không tồn tại' });
        }

        console.log('✅ [createVocabularyForLesson] Lesson found:', lesson.title);

        // Kiểm tra dữ liệu bắt buộc
        if (!vocabularyData.word || !vocabularyData.meaning) {
            return res.status(400).json({ 
                message: 'Từ vựng và nghĩa là bắt buộc' 
            });
        }

        // Kiểm tra từ vựng đã tồn tại trong bài học chưa
        const existingVocabulary = await Vocabulary.findOne({
            word: vocabularyData.word,
            lesson: lessonId
        });

        if (existingVocabulary) {
            return res.status(400).json({ 
                message: 'Từ vựng đã tồn tại trong bài học này' 
            });
        }

        // Tạo từ vựng mới
        const vocabulary = new Vocabulary({
            word: vocabularyData.word.trim(),
            meaning: vocabularyData.meaning.trim(),
            pronunciation: vocabularyData.pronunciation?.trim() || '',
            type: vocabularyData.type || '명사',
            category: vocabularyData.category?.trim() || '',
            examples: vocabularyData.examples || [],
            level: lesson.level || 'Sơ cấp 1',
            lesson: lessonId
        });

        console.log('💾 [createVocabularyForLesson] Saving vocabulary...');

        const savedVocabulary = await vocabulary.save();
        console.log('✅ [createVocabularyForLesson] Vocabulary saved:', savedVocabulary._id);

        // Thêm reference vào lesson
        if (!lesson.vocabulary) {
            lesson.vocabulary = [];
        }
        lesson.vocabulary.push(savedVocabulary._id);
        
        await lesson.save();
        console.log('✅ [createVocabularyForLesson] Lesson updated');

        // Populate để trả về đầy đủ thông tin
        await savedVocabulary.populate('lesson', 'title code level');

        res.status(201).json(savedVocabulary);

    } catch (error) {
        console.error('❌ [createVocabularyForLesson] Error:', error);
        res.status(400).json({ 
            message: error.message || 'Có lỗi xảy ra khi tạo từ vựng' 
        });
    }
};



// lấy danh sách những từ vựng chưa học trong 1 bài học cho user

export const getVocabForLearning = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user._id;

        // 1. Lấy thông tin tiến độ của user cho bài học này
        const progress = await LessonProgress.findOne({ user: userId, lesson: lessonId });
        
        // Lấy danh sách ID các từ đã "mastered"
        const masteredIds = progress 
            ? progress.vocabularyStatus
                .filter(v => v.status === 'mastered')
                .map(v => v.vocabularyId.toString())
            : [];

        // 2. Lấy tất cả từ vựng của bài học
        const lesson = await Lesson.findById(lessonId).select('vocabulary');
        
        // 3. Lọc bỏ những từ đã mastered
        const vocabToLearn = await Vocabulary.find({
            _id: { 
                $in: lesson.vocabulary,
                $nin: masteredIds // KHÔNG lấy những từ đã mastered
            },
            isActive: true
        }).lean();

        res.json({ success: true, data: vocabToLearn });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

///lấy tư vựng kèm trạng thái học của user trong bài học
export const getVocabWithProgress = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user._id; // Lấy từ auth middleware

        // 1. Lấy danh sách từ vựng của bài học
        const lesson = await Lesson.findById(lessonId).populate('vocabulary');
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Bài học không tồn tại' });
        }

        // 2. Lấy tiến độ của user cho bài học này
        const progress = await LessonProgress.findOne({ user: userId, lesson: lessonId });
        
        // Tạo một map để tra cứu trạng thái nhanh hơn
        const statusMap = {};
        if (progress && progress.vocabularyStatus) {
            progress.vocabularyStatus.forEach(item => {
                statusMap[item.vocabularyId.toString()] = item.status;
            });
        }

        // 3. Gán trạng thái vào từng từ vựng
        const vocabData = lesson.vocabulary.map(vocab => {
            const vocabObj = vocab.toObject();
            return {
                ...vocabObj,
                status: statusMap[vocab._id.toString()] || 'unlearned'
            };
        });

        res.json({ success: true, data: vocabData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};