import Grammar from '../models/Grammar.js';
import Lesson from '../models/Lesson.js';
import mongoose from 'mongoose';

// GET /api/grammar - Lấy tất cả ngữ pháp (có filter, pagination)
export const getGrammar = async (req, res) => {
    try {
        const { 
            level, 
            difficulty, 
            search, 
            page = 1, 
            limit = 20 
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
        
        // Search by structure, meaning, explanation or tags
        if (search) {
            query.$or = [
                { structure: { $regex: search, $options: 'i' } },
                { meaning: { $regex: search, $options: 'i' } },
                { explanation: { $regex: search, $options: 'i' } },
                { usage: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const grammar = await Grammar.find(query)
            .sort({ level: 1, structure: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Grammar.countDocuments(query);

        res.json({
            grammar,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/grammar/:id - Lấy ngữ pháp theo ID
export const getGrammarById = async (req, res) => {
    try {
        const grammar = await Grammar.findById(req.params.id);

        if (!grammar) {
            return res.status(404).json({ message: 'Ngữ pháp không tồn tại' });
        }

        // Tăng view count
        grammar.viewCount += 1;
        await grammar.save();

        res.json(grammar);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGrammarByLesson = async (req, res) => {
    try {
        // 1. Lấy tham số
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const { lessonId } = req.params;
        
        console.log('🔍 [getGrammarByLesson] Lesson ID:', lessonId);

        // 2. Validate Lesson ID
        if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
            return res.status(400).json({ message: 'Lesson ID không hợp lệ' });
        }

        // 3. Kiểm tra bài học tồn tại
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Bài học không tồn tại' });
        }
        
        // 4. Xây dựng query
        let query = { 
            lesson: lessonId, 
            isActive: true 
        };
        
        if (search && search.trim() !== '') {
            query.$or = [
                { structure: { $regex: search.trim(), $options: 'i' } },
                { meaning: { $regex: search.trim(), $options: 'i' } },
                { explanation: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        // 5. Thực hiện query
        const skipValue = (page - 1) * limit;

        const grammar = await Grammar.find(query)
            .sort({ structure: 1 })
            .limit(limit)
            .skip(skipValue)
            .lean();

        const total = await Grammar.countDocuments(query);

        const count = grammar ? grammar.length : 0;
        console.log('✅ [getGrammarByLesson] Found grammar:', count);
        
        res.json({
            grammar: grammar || [],
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('❌ [getGrammarByLesson] Error:', error);
        res.status(500).json({ message: error.message || 'Lỗi server khi tải ngữ pháp' });
    }
};

// ✅ THÊM: Tạo grammar cho lesson (giống vocabulary)
export const createGrammarForLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const grammarData = req.body;

        console.log('📥 [createGrammarForLesson] Received data:', grammarData);
        console.log('📥 [createGrammarForLesson] Lesson ID:', lessonId);

        // Kiểm tra lessonId hợp lệ
        if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
            return res.status(400).json({ message: 'Lesson ID không hợp lệ' });
        }

        // Kiểm tra lesson tồn tại
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Bài học không tồn tại' });
        }

        console.log('✅ [createGrammarForLesson] Lesson found:', lesson.title);

        // Kiểm tra dữ liệu bắt buộc
        if (!grammarData.structure || !grammarData.meaning) {
            return res.status(400).json({ 
                message: 'Cấu trúc và nghĩa là bắt buộc' 
            });
        }

        // Kiểm tra grammar đã tồn tại trong lesson chưa
        const existingGrammar = await Grammar.findOne({
            structure: grammarData.structure,
            lesson: lessonId
        });

        if (existingGrammar) {
            return res.status(400).json({ 
                message: 'Ngữ pháp đã tồn tại trong bài học này' 
            });
        }

        // Tạo grammar mới
        const grammar = new Grammar({
            structure: grammarData.structure.trim(),
            meaning: grammarData.meaning.trim(),
            explanation: grammarData.explanation?.trim() || '',
            usage: grammarData.usage?.trim() || '',
            level: lesson.level || 'Sơ cấp 1', // Tự động lấy level từ lesson
            exampleSentences: grammarData.exampleSentences || [],
            similarGrammar: grammarData.similarGrammar || [],
            difficulty: grammarData.difficulty || 'Trung bình',
            tags: grammarData.tags || [],
            lesson: lessonId // Gán lesson
        });

        console.log('💾 [createGrammarForLesson] Saving grammar...');

        const savedGrammar = await grammar.save();
        console.log('✅ [createGrammarForLesson] Grammar saved:', savedGrammar._id);

        // QUAN TRỌNG: Thêm reference vào lesson
        if (!lesson.grammar) {
            lesson.grammar = [];
        }
        lesson.grammar.push(savedGrammar._id);
        
        await lesson.save();
        console.log('✅ [createGrammarForLesson] Lesson updated');

        res.status(201).json(savedGrammar);

    } catch (error) {
        console.error('❌ [createGrammarForLesson] Error:', error);
        res.status(400).json({ 
            message: error.message || 'Có lỗi xảy ra khi tạo ngữ pháp' 
        });
    }
};

// ✅ SỬA: Hàm createGrammar cũ - thêm logic đồng bộ lesson
export const createGrammar = async (req, res) => {
    try {
        const { 
            structure, 
            meaning, 
            explanation, 
            usage, 
            level, 
            exampleSentences, 
            similarGrammar, 
            difficulty, 
            tags,
            lesson // ✅ THÊM: Nhận lesson từ body
        } = req.body;
        
        // Check if grammar structure already exists for this level
        const existingGrammar = await Grammar.findOne({ 
            structure, 
            level 
        });
        
        if (existingGrammar) {
            return res.status(400).json({ message: 'Cấu trúc ngữ pháp đã tồn tại ở level này' });
        }

        const grammar = new Grammar({
            structure,
            meaning,
            explanation,
            usage,
            level,
            exampleSentences: exampleSentences || [],
            similarGrammar: similarGrammar || [],
            difficulty: difficulty || 'Trung bình',
            tags: tags || [],
            lesson: lesson || null // ✅ Lưu lesson nếu có
        });

        const savedGrammar = await grammar.save();
        
        // ✅ THÊM: Đồng bộ với lesson
        if (savedGrammar.lesson) {
            await Lesson.findByIdAndUpdate(
                savedGrammar.lesson,
                { $addToSet: { grammar: savedGrammar._id } },
                { new: true }
            );
            console.log(`✅ Đã thêm grammar ${savedGrammar._id} vào lesson ${savedGrammar.lesson}`);
        }
        
        res.status(201).json(savedGrammar);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// ✅ SỬA: Hàm deleteGrammar - xóa reference khỏi lesson
export const deleteGrammar = async (req, res) => {
    try {
        const grammar = await Grammar.findById(req.params.id);

        if (!grammar) {
            return res.status(404).json({ message: 'Ngữ pháp không tồn tại' });
        }

        // ✅ QUAN TRỌNG: Xóa reference khỏi Lesson
        if (grammar.lesson) {
            await Lesson.findByIdAndUpdate(
                grammar.lesson,
                { $pull: { grammar: req.params.id } }
            );
            console.log(`✅ Đã xóa grammar ${req.params.id} khỏi lesson ${grammar.lesson}`);
        }

        // Soft delete
        grammar.isActive = false;
        await grammar.save();

        res.json({ message: 'Đã xóa ngữ pháp thành công' });
    } catch (error) {
        console.error('❌ [deleteGrammar] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ✅ SỬA: Hàm updateGrammar - đồng bộ lesson khi thay đổi
export const updateGrammar = async (req, res) => {
    try {
        const { lesson: newLessonId } = req.body;
        const grammarId = req.params.id;
        
        // Lấy grammar cũ để kiểm tra lesson cũ
        const oldGrammar = await Grammar.findById(grammarId);
        
        const grammar = await Grammar.findByIdAndUpdate(
            grammarId,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!grammar) {
            return res.status(404).json({ message: 'Ngữ pháp không tồn tại' });
        }

        // ✅ ĐỒNG BỘ VỚI LESSON
        if (oldGrammar && oldGrammar.lesson) {
            // 1. Nếu lesson thay đổi: xóa khỏi lesson cũ
            if (newLessonId && oldGrammar.lesson.toString() !== newLessonId) {
                await Lesson.findByIdAndUpdate(
                    oldGrammar.lesson,
                    { $pull: { grammar: grammarId } }
                );
                console.log(`✅ Đã xóa grammar ${grammarId} khỏi lesson cũ ${oldGrammar.lesson}`);
            }
        }

        // 2. Thêm vào lesson mới (nếu có)
        if (newLessonId) {
            await Lesson.findByIdAndUpdate(
                newLessonId,
                { $addToSet: { grammar: grammarId } }
            );
            console.log(`✅ Đã thêm grammar ${grammarId} vào lesson mới ${newLessonId}`);
        }

        res.json(grammar);
    } catch (error) {
        console.error('❌ [updateGrammar] Error:', error);
        res.status(400).json({ message: error.message });
    }
};


// POST /api/grammar/bulk-create - Tạo nhiều ngữ pháp cùng lúc
export const bulkCreateGrammar = async (req, res) => {
    try {
        const { grammarList } = req.body;
        
        if (!Array.isArray(grammarList) || grammarList.length === 0) {
            return res.status(400).json({ message: 'Danh sách ngữ pháp không hợp lệ' });
        }

        const results = {
            success: [],
            errors: []
        };

        for (const item of grammarList) {
            try {
                // Check if grammar already exists
                const existing = await Grammar.findOne({
                    structure: item.structure,
                    level: item.level
                });

                if (existing) {
                    results.errors.push({
                        structure: item.structure,
                        error: 'Đã tồn tại'
                    });
                    continue;
                }

                const grammar = new Grammar({
                    structure: item.structure,
                    meaning: item.meaning,
                    explanation: item.explanation,
                    usage: item.usage,
                    level: item.level,
                    exampleSentences: item.exampleSentences || [],
                    similarGrammar: item.similarGrammar || [],
                    difficulty: item.difficulty || 'Trung bình',
                    tags: item.tags || []
                });

                const savedGrammar = await grammar.save();
                results.success.push(savedGrammar.structure);
                
            } catch (error) {
                results.errors.push({
                    structure: item.structure,
                    error: error.message
                });
            }
        }

        res.json({
            message: `Import thành công ${results.success.length} ngữ pháp, lỗi ${results.errors.length} ngữ pháp`,
            success: results.success,
            errors: results.errors
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// GET /api/grammar/levels/:level - Lấy ngữ pháp theo level
export const getGrammarByLevel = async (req, res) => {
    try {
        const { level } = req.params;
        const { page = 1, limit = 50, difficulty, search } = req.query;
        
        let query = { 
            level, 
            isActive: true 
        };
        
        if (difficulty) {
            query.difficulty = difficulty;
        }
        
        if (search) {
            query.$or = [
                { structure: { $regex: search, $options: 'i' } },
                { meaning: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const grammar = await Grammar.find(query)
            .sort({ structure: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Grammar.countDocuments(query);

        res.json({
            grammar,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/grammar/stats - Thống kê ngữ pháp
export const getGrammarStats = async (req, res) => {
    try {
        const stats = await Grammar.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$level',
                    count: { $sum: 1 },
                    difficulties: {
                        $push: '$difficulty'
                    },
                    totalViews: { $sum: '$viewCount' }
                }
            },
            {
                $project: {
                    level: '$_id',
                    count: 1,
                    totalViews: 1,
                    difficultyBreakdown: {
                        easy: { 
                            $size: { 
                                $filter: { 
                                    input: '$difficulties', 
                                    as: 'diff', 
                                    cond: { $eq: ['$$diff', 'Dễ'] } 
                                } 
                            } 
                        },
                        medium: { 
                            $size: { 
                                $filter: { 
                                    input: '$difficulties', 
                                    as: 'diff', 
                                    cond: { $eq: ['$$diff', 'Trung bình'] } 
                                } 
                            } 
                        },
                        hard: { 
                            $size: { 
                                $filter: { 
                                    input: '$difficulties', 
                                    as: 'diff', 
                                    cond: { $eq: ['$$diff', 'Khó'] } 
                                } 
                            } 
                        }
                    },
                    _id: 0
                }
            },
            { $sort: { level: 1 } }
        ]);

        const totalGrammar = await Grammar.countDocuments({ isActive: true });
        const totalViews = await Grammar.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: null, total: { $sum: '$viewCount' } } }
        ]);

        res.json({
            totalGrammar,
            totalViews: totalViews[0]?.total || 0,
            stats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/grammar/search/advanced - Tìm kiếm nâng cao
export const advancedSearch = async (req, res) => {
    try {
        const { 
            levels = [], 
            difficulties = [], 
            tags = [], 
            minExamples = 0,
            search,
            page = 1, 
            limit = 20 
        } = req.query;
        
        let query = { isActive: true };
        
        // Filter by levels
        if (levels.length > 0) {
            query.level = { $in: Array.isArray(levels) ? levels : [levels] };
        }
        
        // Filter by difficulties
        if (difficulties.length > 0) {
            query.difficulty = { $in: Array.isArray(difficulties) ? difficulties : [difficulties] };
        }
        
        // Filter by tags
        if (tags.length > 0) {
            query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
        }
        
        // Filter by minimum examples
        if (minExamples > 0) {
            query['exampleSentences'] = { $size: { $gte: parseInt(minExamples) } };
        }
        
        // Search
        if (search) {
            query.$or = [
                { structure: { $regex: search, $options: 'i' } },
                { meaning: { $regex: search, $options: 'i' } },
                { explanation: { $regex: search, $options: 'i' } },
                { usage: { $regex: search, $options: 'i' } }
            ];
        }

        const grammar = await Grammar.find(query)
            .sort({ level: 1, difficulty: 1, structure: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Grammar.countDocuments(query);

        res.json({
            grammar,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/grammar/tags - Lấy danh sách tags
export const getTags = async (req, res) => {
    try {
        const tags = await Grammar.distinct('tags', { isActive: true });
        res.json(tags.filter(tag => tag)); // Remove null/undefined
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};