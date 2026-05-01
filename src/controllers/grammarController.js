import Grammar from '../models/Grammar.js';
import Lesson from '../models/Lesson.js';
import GrammarQuiz from '../models/GrammarQuiz.js';
import GrammarQuizSession from '../models/GrammarQuizSession.js';
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js';
import { updateLessonProgressForQuiz, updateLessonProgressItem } from '../services/lessonProgressService.js';

const isAdminUser = (user) => user && ['admin', 'teacher'].includes(user.role);

const normalizeAnswer = (value) => {
    if (Array.isArray(value)) return value.map(item => String(item).trim().toLowerCase()).sort();
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
};

const isAnswerCorrect = (userAnswer, correctAnswer) => {
    return JSON.stringify(normalizeAnswer(userAnswer)) === JSON.stringify(normalizeAnswer(correctAnswer));
};

const toExerciseDto = (exercise, includeAnswer = false) => {
    const data = exercise.toObject ? exercise.toObject() : { ...exercise };
    const question = {
        id: data.clientId ?? data._id?.toString(),
        clientId: data.clientId,
        type: data.type,
        instruction: data.instruction,
        points: data.points,
        sentenceLeft: data.sentenceLeft,
        sentenceRight: data.sentenceRight,
        vietnameseMeaning: data.vietnameseMeaning,
        maxLength: data.maxLength,
        placeholder: data.placeholder,
        vietnamesePrompt: data.vietnamesePrompt,
        words: data.words
    };

    if (includeAnswer) {
        question.correctAnswerStr = data.correctAnswerStr;
        question.correctOrder = data.correctOrder;
        question.explanation = data.explanation;
    }

    Object.keys(question).forEach(key => question[key] === undefined && delete question[key]);
    return question;
};

const normalizeString = (value) => String(value ?? '').trim().toLowerCase();

const isExerciseCorrect = (exercise, answer) => {
    if (exercise.type === 'whiteboard') {
        return normalizeString(answer) === normalizeString(exercise.correctAnswerStr);
    }

    if (exercise.type === 'word_match') {
        if (!Array.isArray(answer)) return false;
        const userOrder = answer.map(item => String(item).trim());
        const correctOrder = (exercise.correctOrder || []).map(item => String(item).trim());
        return JSON.stringify(userOrder) === JSON.stringify(correctOrder);
    }

    return false;
};

const stripGrammarQuizAnswers = (session) => {
    const data = session.toObject ? session.toObject() : session;
    data.questions?.forEach(item => {
        if (item.question) {
            delete item.question.correctAnswer;
            delete item.question.explanation;
        }
        delete item.isCorrect;
    });
    return data;
};

const snapshotGrammarQuizQuestions = (quiz, limit) => {
    const allowedTypes = ['single_choice', 'short_answer'];
    return (quiz.items || [])
        .flatMap(item => (item.questions || [])
            .filter(question => allowedTypes.includes(question.type))
            .map(question => ({ grammar: item.grammar || quiz.grammar, question })))
        .slice(0, Math.min(Number(limit), 50));
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

        if (!isAdminUser(req.user)) {
            const lessons = await Lesson.find({
                isDeleted: false,
                isPublished: true,
                grammar: grammar._id
            }).select('_id grammar grammarQuizzes vocabulary vocabularyQuizzes listening speaking reading writing');

            await Promise.all(lessons.map(lesson => updateLessonProgressItem({
                userId: req.user._id,
                lesson,
                sectionType: 'grammar',
                moduleType: 'grammar',
                itemId: grammar._id,
                status: 'completed',
                percentage: 100,
                score: 100,
                maxScore: 100,
                resultKind: 'Manual',
                title: grammar.structure
            })));
        }

        return ok(res, grammar, 'Lấy nội dung học ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy nội dung học ngữ pháp: ' + error.message);
    }
};

export const getGrammarExercise = async (req, res) => {
    try {
        const grammar = await Grammar.findOne({ _id: req.params.grammarId, isActive: true });
        if (!grammar) return notFound(res, 'Không tìm thấy ngữ pháp');

        return ok(res, {
            grammarId: grammar._id,
            structure: grammar.structure,
            questions: (grammar.exercises || []).map(exercise => toExerciseDto(exercise, false))
        }, 'Lấy bài tập ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy bài tập ngữ pháp: ' + error.message);
    }
};

export const checkGrammarExercise = async (req, res) => {
    try {
        const grammar = await Grammar.findOne({ _id: req.params.grammarId, isActive: true });
        if (!grammar) return notFound(res, 'Không tìm thấy ngữ pháp');

        const { questionId, answer } = req.body || {};
        if (questionId === undefined || questionId === null) return badRequest(res, 'Thiếu questionId');

        const exercise = findExerciseByQuestionId(grammar.exercises, questionId);
        if (!exercise) return notFound(res, 'Không tìm thấy câu exercise');

        const isCorrect = isExerciseCorrect(exercise, answer);
        return ok(res, {
            questionId: String(exercise.clientId ?? exercise._id),
            isCorrect,
            correctAnswer: getExerciseCorrectAnswer(exercise),
            explanation: exercise.explanation || ''
        }, 'Kiểm tra câu exercise thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi kiểm tra câu exercise: ' + error.message);
    }
};

export const getGrammarQuizzes = async (req, res) => {
    try {
        const { grammarId, level, category, isActive, page = 1, limit = 10 } = req.query;
        const query = {};
        if (grammarId) query.grammar = grammarId;
        if (level) query.level = level;
        if (category) query.category = category;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const skip = (Number(page) - 1) * Number(limit);
        const quizzes = await GrammarQuiz.find(query)
            .populate('grammar', 'structure meaning level')
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await GrammarQuiz.countDocuments(query);

        return ok(res, { quizzes, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Lấy danh sách quiz ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách quiz ngữ pháp: ' + error.message);
    }
};

export const createGrammarQuiz = async (req, res) => {
    try {
        const { title, itemIds, items } = req.body || {};
        if (!title) return badRequest(res, 'Vui lòng cung cấp title');

        const quiz = await GrammarQuiz.create({
            ...req.body,
            items: itemIds || items || [],
            createdBy: req.user?._id
        });

        return created(res, quiz, 'Tạo quiz ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi tạo quiz ngữ pháp: ' + error.message);
    }
};

export const getGrammarQuizById = async (req, res) => {
    try {
        const quiz = await GrammarQuiz.findById(req.params.quizId)
            .populate('grammar', 'structure meaning level')
            .populate({
                path: 'items',
                populate: { path: 'grammar', select: 'structure meaning level' }
            })
            .populate('createdBy', 'username email');

        if (!quiz) return notFound(res, 'Không tìm thấy quiz ngữ pháp');
        return ok(res, quiz, 'Lấy chi tiết quiz ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết quiz ngữ pháp: ' + error.message);
    }
};

export const updateGrammarQuiz = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.itemIds) {
            payload.items = payload.itemIds;
            delete payload.itemIds;
        }

        const quiz = await GrammarQuiz.findByIdAndUpdate(req.params.quizId, payload, {
            returnDocument: 'after',
            runValidators: true
        });

        if (!quiz) return notFound(res, 'Không tìm thấy quiz ngữ pháp để cập nhật');
        return ok(res, quiz, 'Cập nhật quiz ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật quiz ngữ pháp: ' + error.message);
    }
};

export const addGrammarQuizItems = async (req, res) => {
    try {
        const { itemIds } = req.body || {};
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return badRequest(res, 'itemIds phải là mảng có ít nhất một item');
        }

        const quiz = await GrammarQuiz.findById(req.params.quizId);
        if (!quiz) return notFound(res, 'Không tìm thấy quiz ngữ pháp');

        const currentIds = quiz.items.map(id => id.toString());
        itemIds.forEach(itemId => {
            const stringId = itemId.toString();
            if (!currentIds.includes(stringId)) {
                quiz.items.push(itemId);
                currentIds.push(stringId);
            }
        });

        await quiz.save();
        const populated = await GrammarQuiz.findById(quiz._id).populate({
            path: 'items',
            populate: { path: 'grammar', select: 'structure meaning level' }
        });

        return ok(res, populated, 'Đã thêm question grammar vào quiz');
    } catch (error) {
        return serverError(res, 'Lỗi khi thêm question grammar vào quiz: ' + error.message);
    }
};

export const removeGrammarQuizItems = async (req, res) => {
    try {
        const { itemIds } = req.body || {};
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return badRequest(res, 'itemIds phải là mảng có ít nhất một item');
        }

        const quiz = await GrammarQuiz.findById(req.params.quizId);
        if (!quiz) return notFound(res, 'Không tìm thấy quiz ngữ pháp');

        const removeIds = itemIds.map(id => id.toString());
        quiz.items = quiz.items.filter(itemId => !removeIds.includes(itemId.toString()));
        await quiz.save();

        const populated = await GrammarQuiz.findById(quiz._id).populate({
            path: 'items',
            populate: { path: 'grammar', select: 'structure meaning level' }
        });

        return ok(res, populated, 'Đã xóa question grammar khỏi quiz');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa question grammar khỏi quiz: ' + error.message);
    }
};

export const reorderGrammarQuizItems = async (req, res) => {
    try {
        const { itemIds } = req.body || {};
        if (!Array.isArray(itemIds)) return badRequest(res, 'itemIds phải là mảng theo thứ tự mới');

        const quiz = await GrammarQuiz.findById(req.params.quizId);
        if (!quiz) return notFound(res, 'Không tìm thấy quiz ngữ pháp');

        const currentIds = quiz.items.map(id => id.toString());
        const nextIds = itemIds.map(id => id.toString());
        const hasSameItems = currentIds.length === nextIds.length && currentIds.every(id => nextIds.includes(id));
        if (!hasSameItems) return badRequest(res, 'itemIds phải chứa đúng các item hiện có trong quiz');

        quiz.items = itemIds;
        await quiz.save();

        const populated = await GrammarQuiz.findById(quiz._id).populate({
            path: 'items',
            populate: { path: 'grammar', select: 'structure meaning level' }
        });

        return ok(res, populated, 'Đã sắp xếp lại thứ tự question grammar trong quiz');
    } catch (error) {
        return serverError(res, 'Lỗi khi sắp xếp question grammar trong quiz: ' + error.message);
    }
};

export const deleteGrammarQuiz = async (req, res) => {
    try {
        const usedSession = await GrammarQuizSession.findOne({ quiz: req.params.quizId });
        if (usedSession) return badRequest(res, 'Không thể xóa quiz đã có phiên làm bài');

        const quiz = await GrammarQuiz.findByIdAndDelete(req.params.quizId);
        if (!quiz) return notFound(res, 'Không tìm thấy quiz ngữ pháp để xóa');
        return ok(res, null, 'Xóa quiz ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa quiz ngữ pháp: ' + error.message);
    }
};

export const togglePublishGrammarQuiz = async (req, res) => {
    try {
        const quiz = await GrammarQuiz.findById(req.params.quizId);
        if (!quiz) return notFound(res, 'Không tìm thấy quiz ngữ pháp');
        if (!quiz.isActive && quiz.items.length === 0) return badRequest(res, 'Quiz chưa có item từ bank nên không thể publish');

        quiz.isActive = !quiz.isActive;
        await quiz.save();
        return ok(res, quiz, quiz.isActive ? 'Đã publish quiz ngữ pháp' : 'Đã ẩn quiz ngữ pháp');
    } catch (error) {
        return serverError(res, 'Lỗi khi đổi trạng thái quiz ngữ pháp: ' + error.message);
    }
};

export const startGrammarQuiz = async (req, res) => {
    try {
        const { quizId, grammarId, level, category, limit = 50 } = req.body || {};
        const query = { isActive: true };
        if (quizId) query._id = quizId;
        if (grammarId) query.grammar = grammarId;
        if (level) query.level = level;
        if (category) query.category = category;

        const quiz = await GrammarQuiz.findOne(query).populate('items').sort({ updatedAt: -1 });
        if (!quiz) return notFound(res, 'Không tìm thấy quiz ngữ pháp đang hoạt động');

        const questions = snapshotGrammarQuizQuestions(quiz, limit);
        if (questions.length === 0) return badRequest(res, 'Quiz ngữ pháp chưa có câu hỏi hợp lệ');

        const session = await GrammarQuizSession.create({
            user: req.user._id,
            quiz: quiz._id,
            questions,
            maxScore: questions.reduce((sum, item) => sum + (item.question.points || 0), 0),
            startedAt: new Date()
        });

        return created(res, { sessionId: session._id }, 'Đã bắt đầu quiz ngữ pháp');
    } catch (error) {
        return serverError(res, 'Lỗi khi bắt đầu quiz ngữ pháp: ' + error.message);
    }
};

export const getGrammarQuizSession = async (req, res) => {
    try {
        const session = await GrammarQuizSession.findOne({ _id: req.params.sessionId, user: req.user._id })
            .populate('questions.grammar', 'structure meaning level');
        if (!session) return notFound(res, 'Không tìm thấy phiên quiz ngữ pháp');
        return ok(res, stripGrammarQuizAnswers(session), 'Lấy phiên quiz ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy phiên quiz ngữ pháp: ' + error.message);
    }
};

export const saveGrammarQuizAnswer = async (req, res) => {
    try {
        const { questionId, answer, timeSpent } = req.body || {};
        if (!questionId) return badRequest(res, 'Thiếu questionId');

        const session = await GrammarQuizSession.findOne({ _id: req.params.sessionId, user: req.user._id, status: 'in_progress' });
        if (!session) return notFound(res, 'Không tìm thấy phiên quiz ngữ pháp đang làm');

        const question = session.questions.id(questionId);
        if (!question) return notFound(res, 'Không tìm thấy câu hỏi trong phiên quiz');

        question.userAnswer = answer;
        if (timeSpent !== undefined) session.timeSpent = timeSpent;
        await session.save();

        return ok(res, null, 'Đã lưu đáp án quiz ngữ pháp');
    } catch (error) {
        return serverError(res, 'Lỗi khi lưu đáp án quiz ngữ pháp: ' + error.message);
    }
};

export const submitGrammarQuiz = async (req, res) => {
    try {
        const { timeSpent } = req.body || {};
        const session = await GrammarQuizSession.findOne({ _id: req.params.sessionId, user: req.user._id });
        if (!session) return notFound(res, 'Không tìm thấy phiên quiz ngữ pháp');
        if (session.status !== 'in_progress') return badRequest(res, 'Phiên quiz này đã được nộp');

        let totalScore = 0;
        let maxScore = 0;
        session.questions.forEach(item => {
            maxScore += item.question.points || 0;
            const correct = isAnswerCorrect(item.userAnswer, item.question.correctAnswer);
            item.isCorrect = correct;
            if (correct) totalScore += item.question.points || 0;
        });

        session.totalScore = totalScore;
        session.maxScore = maxScore;
        session.percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        session.status = 'completed';
        session.submittedAt = new Date();
        if (timeSpent !== undefined) session.timeSpent = timeSpent;
        await session.save();

        await updateLessonProgressForQuiz({
            userId: req.user._id,
            quizId: session.quiz,
            sectionType: 'grammar',
            moduleType: 'grammarQuiz',
            resultKind: 'GrammarQuizSession',
            resultId: session._id,
            percentage: session.percentage,
            score: totalScore,
            maxScore
        });

        const completed = await GrammarQuizSession.findById(session._id).populate('questions.grammar', 'structure meaning level');
        return ok(res, completed, 'Nộp quiz ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi nộp quiz ngữ pháp: ' + error.message);
    }
};

export const getGrammarQuizResult = async (req, res) => {
    try {
        const session = await GrammarQuizSession.findOne({ _id: req.params.sessionId, user: req.user._id })
            .populate('questions.grammar', 'structure meaning level');
        if (!session) return notFound(res, 'Không tìm thấy kết quả quiz ngữ pháp');
        if (session.status !== 'completed') return badRequest(res, 'Quiz ngữ pháp chưa được nộp');
        return ok(res, session, 'Lấy kết quả quiz ngữ pháp thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy kết quả quiz ngữ pháp: ' + error.message);
    }
};

const getExerciseCorrectAnswer = (exercise) => {
    if (exercise.type === 'whiteboard') return exercise.correctAnswerStr;
    if (exercise.type === 'word_match') return exercise.correctOrder;
    return null;
};

const findExerciseByQuestionId = (exercises, questionId) => {
    return (exercises || []).find(exercise => {
        return String(exercise.clientId ?? '') === String(questionId)
            || String(exercise._id) === String(questionId);
    });
};
