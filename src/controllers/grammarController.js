import Grammar from '../models/Grammar.js';
import GrammarExerciseResult from '../models/GrammarExerciseResult.js';
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js';

const isAdminUser = (user) => user && ['admin', 'teacher'].includes(user.role);

const toExerciseDto = (exercise, includeAnswer = false) => {
    const data = exercise.toObject ? exercise.toObject() : { ...exercise };
    const dto = {
        id: data.clientId ?? data._id?.toString(),
        type: data.type,
        instruction: data.instruction,
        points: data.points,
        sentenceLeft: data.sentenceLeft,
        sentenceRight: data.sentenceRight,
        vietnameseMeaning: data.vietnameseMeaning,
        maxLength: data.maxLength,
        placeholder: data.placeholder,
        vietnamesePrompt: data.vietnamesePrompt,
        words: data.words,
        explanation: includeAnswer ? data.explanation : undefined
    };

    if (includeAnswer) {
        dto.correctAnswerStr = data.correctAnswerStr;
        dto.correctOrder = data.correctOrder;
    }

    Object.keys(dto).forEach(key => dto[key] === undefined && delete dto[key]);
    return dto;
};

const normalizeString = (value) => String(value ?? '').trim();

const isExerciseCorrect = (exercise, answer) => {
    if (exercise.type === 'whiteboard') {
        return normalizeString(answer) === normalizeString(exercise.correctAnswerStr);
    }

    if (exercise.type === 'word_match') {
        const userOrder = Array.isArray(answer) ? answer.map(normalizeString) : [];
        const correctOrder = (exercise.correctOrder || []).map(normalizeString);
        return JSON.stringify(userOrder) === JSON.stringify(correctOrder);
    }

    return false;
};

export const getGrammars = async (req, res) => {
    try {
        const { search, level, tags, isActive, page = 1, limit = 20 } = req.query;
        const query = {};

        if (!isAdminUser(req.user)) query.isActive = true;
        if (isAdminUser(req.user) && isActive !== undefined) query.isActive = isActive === 'true';
        if (level) query.level = level;
        if (tags) query.tags = { $in: tags.split(',').map(tag => tag.trim()) };
        if (search) {
            query.$or = [
                { structure: { $regex: search, $options: 'i' } },
                { meaning: { $regex: search, $options: 'i' } },
                { explanation: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const grammars = await Grammar.find(query)
            .select('-exercises')
            .sort({ level: 1, structure: 1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Grammar.countDocuments(query);

        return ok(res, { grammars, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Lấy danh sách ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách ngữ pháp: ' + error.message);
    }
};

export const createGrammar = async (req, res) => {
    try {
        const grammar = await Grammar.create({ ...req.body, createdBy: req.user?._id });
        return created(res, grammar, 'Tạo ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi tạo ngữ pháp: ' + error.message);
    }
};

export const getGrammarById = async (req, res) => {
    try {
        const grammar = await Grammar.findById(req.params.grammarId).populate('similarGrammar', 'structure meaning level tags');
        if (!grammar) return notFound(res, 'Không tìm thấy ngữ pháp');
        if (!isAdminUser(req.user) && !grammar.isActive) return notFound(res, 'Không tìm thấy ngữ pháp');
        return ok(res, grammar, 'Lấy chi tiết ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết ngữ pháp: ' + error.message);
    }
};

export const updateGrammar = async (req, res) => {
    try {
        const grammar = await Grammar.findByIdAndUpdate(req.params.grammarId, req.body, {
            new: true,
            runValidators: true
        });
        if (!grammar) return notFound(res, 'Không tìm thấy ngữ pháp để cập nhật');
        return ok(res, grammar, 'Cập nhật ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật ngữ pháp: ' + error.message);
    }
};

export const deleteGrammar = async (req, res) => {
    try {
        const grammar = await Grammar.findByIdAndDelete(req.params.grammarId);
        if (!grammar) return notFound(res, 'Không tìm thấy ngữ pháp để xóa');
        return ok(res, null, 'Xóa ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa ngữ pháp: ' + error.message);
    }
};

export const publishGrammar = async (req, res) => {
    try {
        const grammar = await Grammar.findById(req.params.grammarId);
        if (!grammar) return notFound(res, 'Không tìm thấy ngữ pháp');

        grammar.isActive = req.body?.isActive !== undefined ? req.body.isActive : true;
        await grammar.save();

        return ok(res, grammar, grammar.isActive ? 'Đã publish ngữ pháp' : 'Đã ẩn ngữ pháp');
    } catch (error) {
        return serverError(res, 'Lỗi khi publish ngữ pháp: ' + error.message);
    }
};

export const importGrammars = async (req, res) => {
    try {
        const items = Array.isArray(req.body) ? req.body : req.body?.items;
        if (!Array.isArray(items) || items.length === 0) {
            return badRequest(res, 'Body phải là mảng hoặc { items: [...] }');
        }

        const payload = items.map(item => ({ ...item, createdBy: req.user?._id }));
        const grammars = await Grammar.insertMany(payload, { ordered: false });
        return created(res, { count: grammars.length, grammars }, 'Import ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi import ngữ pháp: ' + error.message);
    }
};

export const getSimilarGrammars = async (req, res) => {
    try {
        const grammar = await Grammar.findById(req.params.grammarId).populate('similarGrammar', 'structure meaning level tags');
        if (!grammar) return notFound(res, 'Không tìm thấy ngữ pháp');

        if (grammar.similarGrammar?.length) {
            return ok(res, grammar.similarGrammar, 'Lấy ngữ pháp tương tự thành công');
        }

        const related = await Grammar.find({
            _id: { $ne: grammar._id },
            isActive: true,
            $or: [
                { level: grammar.level },
                { tags: { $in: grammar.tags || [] } }
            ]
        }).select('structure meaning level tags').limit(10);

        return ok(res, related, 'Lấy ngữ pháp liên quan thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy ngữ pháp tương tự: ' + error.message);
    }
};

export const getGrammarDetail = async (req, res) => {
    try {
        const grammar = await Grammar.findOne({ _id: req.params.grammarId, isActive: true })
            .select('-exercises')
            .populate('similarGrammar', 'structure meaning level tags');
        if (!grammar) return notFound(res, 'Không tìm thấy nội dung học ngữ pháp');
        return ok(res, grammar, 'Lấy nội dung học ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy nội dung học ngữ pháp: ' + error.message);
    }
};

export const getGrammarExercise = async (req, res) => {
    try {
        const grammar = await Grammar.findOne({ _id: req.params.grammarId, isActive: true });
        if (!grammar) return notFound(res, 'Không tìm thấy bài tập ngữ pháp');

        return ok(res, {
            grammarId: grammar._id,
            structure: grammar.structure,
            questions: grammar.exercises.map(exercise => toExerciseDto(exercise, false))
        }, 'Lấy bài tập ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy bài tập ngữ pháp: ' + error.message);
    }
};

export const submitGrammarExercise = async (req, res) => {
    try {
        const grammar = await Grammar.findOne({ _id: req.params.grammarId, isActive: true });
        if (!grammar) return notFound(res, 'Không tìm thấy bài tập ngữ pháp');

        const answers = req.body?.answers;
        if (!Array.isArray(answers)) return badRequest(res, 'answers phải là một mảng');

        let totalScore = 0;
        let maxScore = 0;

        const answerResults = grammar.exercises.map(exercise => {
            const questionId = exercise.clientId ?? exercise._id.toString();
            const submitted = answers.find(answer => String(answer.questionId) === String(questionId));
            const points = exercise.points || 1;
            maxScore += points;

            const isCorrect = isExerciseCorrect(exercise, submitted?.answer);
            if (isCorrect) totalScore += points;

            return {
                questionId: String(questionId),
                userAnswer: submitted?.answer,
                correctAnswer: exercise.type === 'whiteboard' ? exercise.correctAnswerStr : exercise.correctOrder,
                isCorrect,
                points: isCorrect ? points : 0
            };
        });

        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        const result = await GrammarExerciseResult.create({
            user: req.user._id,
            grammar: grammar._id,
            answers: answerResults,
            totalScore,
            maxScore,
            percentage
        });

        return ok(res, result, 'Nộp bài tập ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi nộp bài tập ngữ pháp: ' + error.message);
    }
};

export const getGrammarResult = async (req, res) => {
    try {
        const result = await GrammarExerciseResult.findOne({
            user: req.user._id,
            grammar: req.params.grammarId
        }).sort({ createdAt: -1 });

        if (!result) return notFound(res, 'Chưa có kết quả bài tập ngữ pháp');
        return ok(res, result, 'Lấy kết quả bài tập ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy kết quả bài tập ngữ pháp: ' + error.message);
    }
};
