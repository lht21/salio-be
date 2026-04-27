import Quiz from '../models/Quiz.js';
import QuizSession from '../models/QuizSession.js';
import Lesson from '../models/Lesson.js';
import { ok, badRequest, notFound, created, serverError } from '../utils/response.js';

const PLACEMENT_SECTION_TYPES = ['listening', 'reading'];

const populateQuiz = (query) => query
    .populate('sections.listening')
    .populate('sections.reading')
    .populate('placementConfig.levelRules.skippedLessons', 'code title level order');

const getActivePlacementQuiz = async () => Quiz.findOne({ type: 'placement', isActive: true }).sort({ updatedAt: -1 });

const getOrCreatePlacementQuiz = async (userId) => {
    const quiz = await getActivePlacementQuiz();
    if (quiz) return quiz;

    return Quiz.create({
        title: 'Placement Test',
        type: 'placement',
        createdBy: userId,
        isActive: true
    });
};

const mergeUniqueIds = (currentIds, incomingIds) => {
    const merged = [...currentIds.map(id => id.toString())];

    incomingIds.forEach(id => {
        const stringId = id.toString();
        if (!merged.includes(stringId)) merged.push(stringId);
    });

    return merged;
};

const stripUnsupportedPlacementSections = (data) => {
    if (!data.sections) return data;
    data.sections = {
        listening: data.sections.listening || [],
        reading: data.sections.reading || []
    };
    return data;
};

const stripQuestionAnswers = (quiz) => {
    const data = quiz.toObject ? quiz.toObject() : quiz;

    data.questions?.forEach(question => {
        delete question.correctAnswer;
        delete question.explanation;
    });

    PLACEMENT_SECTION_TYPES.forEach(sectionType => {
        data.sections?.[sectionType]?.forEach(item => {
            item.questions?.forEach(question => {
                delete question.correctAnswer;
                delete question.explanation;
            });
        });
    });

    return stripUnsupportedPlacementSections(data);
};

const normalizeAnswer = (value) => {
    if (Array.isArray(value)) return value.map(String).sort();
    if (value === null || value === undefined) return value;
    return String(value).trim();
};

const isAnswerCorrect = (userAnswer, correctAnswer) => {
    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);
    return JSON.stringify(normalizedUserAnswer) === JSON.stringify(normalizedCorrectAnswer);
};

const collectGradableQuestions = (quiz) => {
    const questions = [];

    quiz.questions?.forEach(question => {
        if (question.correctAnswer !== undefined && question.correctAnswer !== null) {
            questions.push({ sectionType: 'quiz', itemId: undefined, question });
        }
    });

    PLACEMENT_SECTION_TYPES.forEach(sectionType => {
        quiz.sections?.[sectionType]?.forEach(item => {
            item.questions?.forEach(question => {
                if (question.correctAnswer !== undefined && question.correctAnswer !== null) {
                    questions.push({ sectionType, itemId: item._id, question });
                }
            });
        });
    });

    return questions;
};

const findLevelRule = (quiz, percentage) => {
    const rules = quiz.placementConfig?.levelRules || [];
    return rules.find(rule => percentage >= rule.minPercent && percentage <= rule.maxPercent) || rules[0];
};

const resolveSkippedLessons = async (rule) => {
    if (!rule) return [];

    if (rule.skippedLessons?.length) {
        return rule.skippedLessons.map(lesson => lesson._id || lesson);
    }

    if (rule.skipLessonOrderUpTo > 0) {
        const lessons = await Lesson.find({
            order: { $lte: rule.skipLessonOrderUpTo },
            isPublished: true
        }).select('_id');
        return lessons.map(lesson => lesson._id);
    }

    return [];
};

export const getPlacementTestConfig = async (req, res) => {
    try {
        const quiz = await populateQuiz(Quiz.findOne({ type: 'placement', isActive: true }).sort({ updatedAt: -1 }));
        if (!quiz) return notFound(res, 'Chưa có Placement Test đang hoạt động');
        return ok(res, stripUnsupportedPlacementSections(quiz.toObject()), 'Lấy cấu hình Placement Test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy cấu hình Placement Test: ' + error.message);
    }
};

export const assemblePlacementTest = async (req, res) => {
    try {
        const { sectionType, itemIds, mode = 'append' } = req.body || {};

        if (!PLACEMENT_SECTION_TYPES.includes(sectionType)) {
            return badRequest(res, 'sectionType không hợp lệ. Placement Test chỉ chấp nhận: listening, reading');
        }

        if (!Array.isArray(itemIds)) {
            return badRequest(res, 'itemIds phải là một mảng');
        }

        if (!['append', 'replace'].includes(mode)) {
            return badRequest(res, 'mode không hợp lệ. Chỉ chấp nhận: append hoặc replace');
        }

        const quiz = await getOrCreatePlacementQuiz(req.user?._id);

        quiz.sections[sectionType] = mode === 'replace'
            ? itemIds
            : mergeUniqueIds(quiz.sections[sectionType], itemIds);

        await quiz.save();

        const populated = await populateQuiz(Quiz.findById(quiz._id));
        return ok(res, populated, `Đã ${mode === 'replace' ? 'ghi đè' : 'thêm'} ${itemIds.length} item vào section ${sectionType}`);
    } catch (error) {
        return serverError(res, 'Lỗi khi lắp ráp Placement Test: ' + error.message);
    }
};

export const reorderPlacementQuestions = async (req, res) => {
    try {
        const { sectionType, itemIds } = req.body;

        if (!PLACEMENT_SECTION_TYPES.includes(sectionType)) {
            return badRequest(res, 'sectionType không hợp lệ');
        }

        if (!Array.isArray(itemIds)) {
            return badRequest(res, 'itemIds phải là một mảng theo thứ tự mới');
        }

        const quiz = await getActivePlacementQuiz();
        if (!quiz) return notFound(res, 'Chưa có Placement Test đang hoạt động');

        const currentIds = quiz.sections[sectionType].map(id => id.toString());
        const nextIds = itemIds.map(id => id.toString());
        const hasSameItems = currentIds.length === nextIds.length && currentIds.every(id => nextIds.includes(id));

        if (!hasSameItems) {
            return badRequest(res, 'itemIds phải chứa đúng các item hiện có trong section');
        }

        quiz.sections[sectionType] = itemIds;
        await quiz.save();

        const populated = await populateQuiz(Quiz.findById(quiz._id));
        return ok(res, populated, `Đã sắp xếp lại section ${sectionType}`);
    } catch (error) {
        return serverError(res, 'Lỗi khi sắp xếp câu hỏi Placement Test: ' + error.message);
    }
};

export const removePlacementItems = async (req, res) => {
    try {
        const { sectionType, itemIds } = req.body || {};

        if (!PLACEMENT_SECTION_TYPES.includes(sectionType)) {
            return badRequest(res, 'sectionType không hợp lệ');
        }

        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return badRequest(res, 'itemIds phải là một mảng có ít nhất một ID');
        }

        const quiz = await getActivePlacementQuiz();
        if (!quiz) return notFound(res, 'Chưa có Placement Test đang hoạt động');

        const removeIds = itemIds.map(id => id.toString());
        quiz.sections[sectionType] = quiz.sections[sectionType].filter(id => !removeIds.includes(id.toString()));
        await quiz.save();

        const populated = await populateQuiz(Quiz.findById(quiz._id));
        return ok(res, populated, `Đã xóa ${itemIds.length} item khỏi section ${sectionType}`);
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa item khỏi Placement Test: ' + error.message);
    }
};

export const startPlacementTest = async (req, res) => {
    try {
        const quiz = await getActivePlacementQuiz();
        if (!quiz) return notFound(res, 'Chưa có Placement Test đang hoạt động');

        const totalBankItems = PLACEMENT_SECTION_TYPES.reduce((sum, sectionType) => sum + quiz.sections[sectionType].length, 0);
        const totalInlineQuestions = quiz.questions?.length || 0;
        if (totalBankItems + totalInlineQuestions === 0) {
            return badRequest(res, 'Placement Test chưa được cấu hình câu hỏi');
        }

        const session = await QuizSession.create({
            user: req.user._id,
            quiz: quiz._id,
            purpose: 'placement',
            status: 'in_progress',
            startedAt: new Date()
        });

        return created(res, { sessionId: session._id }, 'Đã bắt đầu Placement Test');
    } catch (error) {
        return serverError(res, 'Lỗi khi bắt đầu Placement Test: ' + error.message);
    }
};

export const getPlacementSession = async (req, res) => {
    try {
        const session = await QuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id,
            purpose: 'placement'
        }).lean();

        if (!session) return notFound(res, 'Không tìm thấy phiên Placement Test');

        const quiz = await populateQuiz(Quiz.findById(session.quiz));
        if (!quiz) return notFound(res, 'Không tìm thấy cấu hình Placement Test');

        return ok(res, {
            session,
            quiz: stripQuestionAnswers(quiz)
        }, 'Lấy phiên Placement Test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy phiên Placement Test: ' + error.message);
    }
};

export const savePlacementAnswer = async (req, res) => {
    try {
        const { sectionType = 'quiz', itemId, questionId, answer, timeSpent } = req.body || {};

        if (!['quiz', ...PLACEMENT_SECTION_TYPES].includes(sectionType)) return badRequest(res, 'sectionType không hợp lệ');
        if (!questionId) return badRequest(res, 'Thiếu questionId');
        if (sectionType !== 'quiz' && !itemId) return badRequest(res, 'Thiếu itemId');

        const session = await QuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id,
            purpose: 'placement',
            status: 'in_progress'
        });

        if (!session) return notFound(res, 'Không tìm thấy phiên Placement Test đang làm');

        const existingIndex = session.answers.findIndex(answerItem => answerItem.questionId.toString() === questionId);
        const answerData = { sectionType, itemId, questionId, userAnswer: answer, isCorrect: false, points: 0 };

        if (existingIndex >= 0) {
            session.answers[existingIndex].set(answerData);
        } else {
            session.answers.push(answerData);
        }

        if (timeSpent !== undefined) session.timeSpent = timeSpent;
        await session.save();

        return ok(res, null, 'Đã lưu đáp án Placement Test');
    } catch (error) {
        return serverError(res, 'Lỗi khi lưu đáp án Placement Test: ' + error.message);
    }
};

export const submitPlacementSession = async (req, res) => {
    try {
        const { timeSpent } = req.body || {};

        const session = await QuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id,
            purpose: 'placement'
        });

        if (!session) return notFound(res, 'Không tìm thấy phiên Placement Test');
        if (session.status !== 'in_progress') return badRequest(res, 'Phiên Placement Test này đã được nộp');

        const quiz = await populateQuiz(Quiz.findById(session.quiz));
        if (!quiz) return notFound(res, 'Không tìm thấy cấu hình Placement Test');

        const gradableQuestions = collectGradableQuestions(quiz);
        let totalScore = 0;
        let maxScore = 0;

        gradableQuestions.forEach(({ question }) => {
            maxScore += question.points || 0;
        });

        session.answers.forEach(answerItem => {
            const matched = gradableQuestions.find(({ question }) => question._id.toString() === answerItem.questionId.toString());
            if (!matched) return;

            const points = matched.question.points || 0;
            const correct = isAnswerCorrect(answerItem.userAnswer, matched.question.correctAnswer);
            answerItem.isCorrect = correct;
            answerItem.points = correct ? points : 0;
            totalScore += answerItem.points;
        });

        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        const levelRule = findLevelRule(quiz, percentage);
        const skippedLessons = await resolveSkippedLessons(levelRule);

        session.totalScore = totalScore;
        session.maxScore = maxScore;
        session.percentage = percentage;
        session.passed = percentage >= (quiz.passingScore || 0);
        session.recommendedLevel = levelRule?.level || 'Sơ cấp 1';
        session.skipLessonOrderUpTo = levelRule?.skipLessonOrderUpTo || 0;
        session.skippedLessons = skippedLessons;
        session.status = 'completed';
        session.submittedAt = new Date();
        if (timeSpent !== undefined) session.timeSpent = timeSpent;
        await session.save();

        req.user.level = session.recommendedLevel;
        await req.user.save();

        const completedSession = await QuizSession.findById(session._id).populate('skippedLessons', 'code title level order');
        return ok(res, completedSession, 'Nộp Placement Test và xác định level thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi nộp Placement Test: ' + error.message);
    }
};

export const getPlacementResult = async (req, res) => {
    try {
        const session = await QuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id,
            purpose: 'placement'
        }).populate('skippedLessons', 'code title level order').lean();

        if (!session) return notFound(res, 'Không tìm thấy kết quả Placement Test');
        if (session.status !== 'completed') return badRequest(res, 'Placement Test chưa được nộp');

        return ok(res, session, 'Lấy kết quả Placement Test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy kết quả Placement Test: ' + error.message);
    }
};

export const getSkippedLessons = async (req, res) => {
    try {
        const session = await QuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id,
            purpose: 'placement'
        }).populate('skippedLessons', 'code title level order description thumbnail').lean();

        if (!session) return notFound(res, 'Không tìm thấy phiên Placement Test');
        if (session.status !== 'completed') return badRequest(res, 'Placement Test chưa được nộp');

        return ok(res, {
            recommendedLevel: session.recommendedLevel,
            skippedLessons: session.skippedLessons
        }, 'Lấy danh sách lesson được bỏ qua thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách lesson được bỏ qua: ' + error.message);
    }
};

export const getPlacementSessions = async (req, res) => {
    try {
        const { status, user, page = 1, limit = 10 } = req.query;
        const query = { purpose: 'placement' };
        if (status) query.status = status;
        if (user) query.user = user;

        const skip = (Number(page) - 1) * Number(limit);
        const sessions = await QuizSession.find(query)
            .populate('user', 'username email level')
            .populate('quiz', 'title type')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await QuizSession.countDocuments(query);

        return ok(res, {
            sessions,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy danh sách phiên Placement Test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách phiên Placement Test: ' + error.message);
    }
};

export const getPlacementSessionById = async (req, res) => {
    try {
        const session = await QuizSession.findOne({
            _id: req.params.sessionId,
            purpose: 'placement'
        })
            .populate('user', 'username email level')
            .populate('skippedLessons', 'code title level order')
            .populate({
                path: 'quiz',
                populate: [
                    { path: 'sections.listening' },
                    { path: 'sections.reading' }
                ]
            });

        if (!session) return notFound(res, 'Không tìm thấy phiên Placement Test');
        return ok(res, session, 'Lấy chi tiết phiên Placement Test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết phiên Placement Test: ' + error.message);
    }
};
