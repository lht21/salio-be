import mongoose from 'mongoose';
import Lesson from '../models/Lesson.js';
import LessonProgress from '../models/LessonProgress.js';
import UserProgress from '../models/UserProgress.js';
import Vocabulary from '../models/Vocabulary.js';
import VocabularyQuiz from '../models/VocabularyQuiz.js';
import Grammar from '../models/Grammar.js';
import GrammarQuiz from '../models/GrammarQuiz.js';
import Listening from '../models/Listening.js';
import Speaking from '../models/Speaking.js';
import Reading from '../models/Reading.js';
import Writing from '../models/Writing.js';
import Quiz from '../models/Quiz.js';
import QuizSession from '../models/QuizSession.js';
import LessonSkillResult from '../models/LessonSkillResult.js';
import WritingSubmission from '../models/WritingSubmission.js';
import SpeakingSubmission from '../models/SpeakingSubmission.js';
import SpeakingProgress from '../models/SpeakingProgress.js';
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js';
import { ensureLessonProgressForUser } from '../services/lessonProgressService.js';
import { assessSpeakingSubmission } from '../services/speakingAssessmentService.js';
import { evaluateWritingWithAI } from './gradingController.js';

const LESSON_SECTIONS = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
const FINAL_TEST_SECTION_TYPES = ['listening', 'reading', 'writing', 'speaking'];
const RESULT_REF_KINDS = ['VocabularyQuizSession', 'GrammarQuizSession', 'QuizSession', 'SpeakingSubmission', 'WritingSubmission', 'Manual'];

const MODULES = {
    vocabulary: { field: 'vocabulary', model: Vocabulary, progressSection: 'vocabulary', isArray: true },
    vocab: { field: 'vocabulary', model: Vocabulary, progressSection: 'vocabulary', isArray: true },
    vocabularyQuiz: { field: 'vocabularyQuizzes', model: VocabularyQuiz, progressSection: 'vocabulary', isArray: true },
    'vocabulary-quiz': { field: 'vocabularyQuizzes', model: VocabularyQuiz, progressSection: 'vocabulary', isArray: true },
    grammar: { field: 'grammar', model: Grammar, progressSection: 'grammar', isArray: true },
    grammarQuiz: { field: 'grammarQuizzes', model: GrammarQuiz, progressSection: 'grammar', isArray: true },
    'grammar-quiz': { field: 'grammarQuizzes', model: GrammarQuiz, progressSection: 'grammar', isArray: true },
    listening: { field: 'listening', model: Listening, progressSection: 'listening', isArray: true },
    speaking: { field: 'speaking', model: Speaking, progressSection: 'speaking', isArray: true },
    reading: { field: 'reading', model: Reading, progressSection: 'reading', isArray: true },
    writing: { field: 'writing', model: Writing, progressSection: 'writing', isArray: true },
    finalTest: { field: 'finalTest', model: Quiz, isArray: false },
    'final-test': { field: 'finalTest', model: Quiz, isArray: false }
};

const isAdminUser = (user) => user && ['admin', 'teacher'].includes(user.role);

const assertObjectId = (id, label = 'id') => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error(`${label} không hợp lệ`);
        error.statusCode = 400;
        throw error;
    }
};

const getModuleConfig = (moduleType) => MODULES[moduleType];

const lessonPopulate = [
    { path: 'vocabulary' },
    { path: 'vocabularyQuizzes' },
    { path: 'grammar' },
    { path: 'grammarQuizzes' },
    { path: 'listening' },
    { path: 'speaking' },
    { path: 'reading' },
    { path: 'writing' },
    { path: 'finalTest' },
    { path: 'createdBy', select: 'username email role' }
];

const applyLessonAccess = (query, user) => {
    query.isDeleted = false;
    if (!isAdminUser(user)) query.isPublished = true;
    return query;
};

const getNextOrder = async () => {
    const latest = await Lesson.findOne({ isDeleted: false }).sort({ order: -1 }).select('order');
    return (latest?.order || 0) + 1;
};

const getProgressItemRefs = (lesson, sectionName) => {
    if (sectionName === 'vocabulary') {
        return [
            ...(lesson.vocabulary || []).map(itemId => ({ moduleType: 'vocabulary', itemId })),
            ...(lesson.vocabularyQuizzes || []).map(itemId => ({ moduleType: 'vocabularyQuiz', itemId }))
        ];
    }
    if (sectionName === 'grammar') {
        return [
            ...(lesson.grammar || []).map(itemId => ({ moduleType: 'grammar', itemId })),
            ...(lesson.grammarQuizzes || []).map(itemId => ({ moduleType: 'grammarQuiz', itemId }))
        ];
    }
    return (lesson[sectionName] || []).map(itemId => ({ moduleType: sectionName, itemId }));
};

const buildSectionProgress = (lesson, sectionName, isUnlocked) => {
    const items = getProgressItemRefs(lesson, sectionName);
    return {
        isUnlocked,
        totalItems: items.length,
        completedCount: 0,
        progress: 0,
        items: items.map(({ moduleType, itemId }) => ({
            moduleType,
            itemId,
            status: isUnlocked ? 'learning' : 'locked',
            score: 0,
            maxScore: 100,
            percentage: 0,
            attempts: 0
        }))
    };
};

const buildInitialProgress = (lesson, userId) => {
    const sections = {};
    let firstUnlocked = false;

    LESSON_SECTIONS.forEach(sectionName => {
        const hasItems = getProgressItemRefs(lesson, sectionName).length > 0;
        const shouldUnlock = hasItems && !firstUnlocked;
        if (shouldUnlock) firstUnlocked = true;
        sections[sectionName] = buildSectionProgress(lesson, sectionName, shouldUnlock);
    });

    return {
        user: userId,
        lesson: lesson._id,
        isUnlocked: true,
        sections,
        overallProgress: 0,
        isCompleted: false,
        lastAccessed: new Date()
    };
};

const addUniqueIds = (currentIds, ids) => {
    const existing = new Set((currentIds || []).map(id => id.toString()));
    const next = [...(currentIds || [])];
    ids.forEach(id => {
        if (!existing.has(id.toString())) {
            next.push(id);
            existing.add(id.toString());
        }
    });
    return next;
};

const populateFinalTest = (query) => query
    .populate('sections.listening')
    .populate('sections.reading')
    .populate('sections.writing')
    .populate('sections.speaking')
    .populate('lesson', 'code title level order');

const getLessonWithFinalTest = async (lessonId, user) => {
    assertObjectId(lessonId, 'lessonId');
    return Lesson.findOne(applyLessonAccess({ _id: lessonId }, user)).populate('finalTest');
};

const getOrCreateFinalTest = async (lesson, userId, payload = {}) => {
    if (lesson.finalTest) {
        const existing = await Quiz.findById(lesson.finalTest);
        if (existing) return existing;
    }

    const quiz = await Quiz.create({
        title: payload.title || `Final Test - ${lesson.title}`,
        description: payload.description,
        type: 'lesson_final',
        lesson: lesson._id,
        level: payload.level || lesson.level,
        passingScore: payload.passingScore ?? 80,
        timeLimit: payload.timeLimit ?? 300,
        createdBy: userId,
        isActive: payload.isActive ?? false
    });

    lesson.finalTest = quiz._id;
    await lesson.save();
    return quiz;
};

const stripFinalTestAnswers = (quiz) => {
    const data = quiz.toObject ? quiz.toObject() : quiz;

    data.questions?.forEach(question => {
        delete question.correctAnswer;
        delete question.explanation;
    });

    FINAL_TEST_SECTION_TYPES.forEach(sectionType => {
        data.sections?.[sectionType]?.forEach(item => {
            item.questions?.forEach(question => {
                delete question.correctAnswer;
                delete question.explanation;
            });
        });
    });

    return data;
};

const normalizeFinalAnswer = (value) => {
    if (Array.isArray(value)) return value.map(String).sort();
    if (value === null || value === undefined) return value;
    return String(value).trim();
};

const isFinalAnswerCorrect = (userAnswer, correctAnswer) => {
    return JSON.stringify(normalizeFinalAnswer(userAnswer)) === JSON.stringify(normalizeFinalAnswer(correctAnswer));
};

const collectFinalTestQuestions = (quiz) => {
    const questions = [];

    quiz.questions?.forEach(question => {
        if (question.correctAnswer !== undefined && question.correctAnswer !== null) {
            questions.push({ sectionType: 'quiz', itemId: undefined, question });
        }
    });

    FINAL_TEST_SECTION_TYPES.forEach(sectionType => {
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

const countFinalTestItems = (quiz) => {
    const sectionCount = FINAL_TEST_SECTION_TYPES.reduce((sum, sectionType) => {
        return sum + (quiz.sections?.[sectionType]?.length || 0);
    }, 0);

    return sectionCount + (quiz.questions?.length || 0);
};

const stripItemAnswers = (item) => {
    const data = item.toObject ? item.toObject() : item;
    data.questions?.forEach(question => {
        delete question.correctAnswer;
        delete question.explanation;
    });
    return data;
};

const normalizeSkillAnswer = (value) => {
    if (Array.isArray(value)) return value.map(item => String(item).trim()).sort();
    if (value === null || value === undefined) return value;
    return String(value).trim();
};

const isSkillAnswerCorrect = (userAnswer, correctAnswer) => {
    return JSON.stringify(normalizeSkillAnswer(userAnswer)) === JSON.stringify(normalizeSkillAnswer(correctAnswer));
};

const getQuestionCategory = (sectionType, question) => {
    const explicitCategory = question.metadata?.skillCategory || question.metadata?.category;
    if (explicitCategory) return explicitCategory;
    if (question.type === 'true_false') return 'trueFalse';
    if (sectionType === 'listening' && ['single_choice', 'multiple_choice'].includes(question.type)) return 'choice';
    if (sectionType === 'reading' && question.metadata?.isVocabularyQuestion) return 'vocabularyClassification';
    return 'deepComprehension';
};

const buildBreakdown = (answerResults) => {
    const grouped = {};

    answerResults.forEach(answer => {
        const category = answer.category || 'other';
        if (!grouped[category]) grouped[category] = { score: 0, maxScore: 0, correctCount: 0, totalCount: 0 };
        grouped[category].score += answer.points || 0;
        grouped[category].maxScore += answer.maxPoints || 0;
        grouped[category].correctCount += answer.isCorrect ? 1 : 0;
        grouped[category].totalCount += 1;
    });

    Object.keys(grouped).forEach(category => {
        const item = grouped[category];
        item.percentage = item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0;
    });

    return grouped;
};

const normalizeSpeakingEvaluation = (payload = {}) => {
    const source = payload.evaluation || payload.aiEvaluation || payload;
    const pronunciation = Number(source.pronunciation || 0);
    const intonation = Number(source.intonation || 0);
    const accuracy = Number(source.accuracy || 0);
    const fluency = Number(source.fluency || 0);
    const scores = [pronunciation, intonation, accuracy, fluency];
    const percentage = source.percentage !== undefined
        ? Number(source.percentage)
        : Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);

    return {
        percentage,
        score: source.score !== undefined ? Number(source.score) : percentage,
        pronunciation,
        intonation,
        accuracy,
        fluency,
        transcript: source.transcript,
        feedback: source.feedback,
        suggestions: source.suggestions,
        strengths: source.strengths || [],
        areasForImprovement: source.areasForImprovement || [],
        recommendedExercises: source.recommendedExercises || [],
        provider: source.provider,
        rawResult: source.rawResult
    };
};

const updateSpeakingPracticeProgress = async ({ userId, lessonId, speakingId, submission, evaluation }) => {
    const score = Number(evaluation?.percentage || evaluation?.score || 0);
    const current = await SpeakingProgress.findOne({ user: userId, speaking: speakingId });
    const nextAttempts = (current?.attempts || 0) + 1;
    const nextAverageScore = Math.round((((current?.averageScore || 0) * (current?.attempts || 0)) + score) / nextAttempts);

    await SpeakingProgress.findOneAndUpdate(
        { user: userId, speaking: speakingId },
        {
            $set: {
                lesson: lessonId,
                bestScore: Math.max(current?.bestScore || 0, score),
                averageScore: nextAverageScore,
                completed: score >= (current?.targetScore || 70),
                completedAt: score >= (current?.targetScore || 70) ? new Date() : current?.completedAt,
                skillScores: {
                    pronunciation: evaluation?.pronunciation || 0,
                    intonation: evaluation?.intonation || 0,
                    accuracy: evaluation?.accuracy || 0,
                    fluency: evaluation?.fluency || 0,
                    vocabulary: current?.skillScores?.vocabulary || 0,
                    grammar: current?.skillScores?.grammar || 0,
                    content: current?.skillScores?.content || 0
                },
                lastAttempt: {
                    score,
                    recordingUrl: submission.audioUrl,
                    submittedAt: submission.submittedAt,
                    evaluation: {
                        score,
                        feedback: evaluation?.feedback
                    }
                },
                lastAccessed: new Date()
            },
            $inc: {
                attempts: 1,
                totalPracticeTime: submission.recordingDuration || 0
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

const applySpeakingEvaluation = async ({ userId, lesson, item, itemId, submission, evaluationPayload }) => {
    const evaluation = normalizeSpeakingEvaluation({ evaluation: evaluationPayload });

    submission.status = 'evaluated';
    submission.evaluation = {
        ...evaluation,
        evaluatedBy: userId,
        evaluatedAt: new Date()
    };
    submission.wordCount = evaluation.transcript?.trim()
        ? evaluation.transcript.trim().split(/\s+/).length
        : submission.wordCount;
    await submission.save();

    await updateSpeakingPracticeProgress({
        userId: submission.student,
        lessonId: lesson._id,
        speakingId: item._id,
        submission,
        evaluation
    });

    const progress = await updateProgressItemResult({
        userId: submission.student,
        lesson,
        sectionType: 'speaking',
        itemId,
        status: 'completed',
        percentage: evaluation.percentage,
        score: evaluation.percentage,
        maxScore: 100,
        resultKind: 'SpeakingSubmission',
        resultId: submission._id,
        breakdown: {
            pronunciation: evaluation.pronunciation,
            intonation: evaluation.intonation,
            accuracy: evaluation.accuracy,
            fluency: evaluation.fluency
        },
        title: item.title
    });

    return { evaluation, progress };
};

const assertLessonHasSkillItem = (lesson, sectionType, itemId) => {
    const ids = lesson[sectionType] || [];
    return ids.some(id => id.toString() === itemId.toString());
};

const updateProgressItemResult = async ({
    userId,
    lesson,
    sectionType,
    itemId,
    status = 'completed',
    percentage = 0,
    score = percentage,
    maxScore = 100,
    resultKind = 'Manual',
    resultId,
    breakdown,
    title
}) => {
    let progress = await LessonProgress.findOne({ user: userId, lesson: lesson._id });
    if (!progress) progress = new LessonProgress(buildInitialProgress(lesson, userId));

    const section = progress.sections[sectionType];
    if (!section) return progress;

    if (!section.items.some(sectionItem => sectionItem.itemId.toString() === itemId.toString())) {
        section.items.push({
            moduleType: sectionType,
            itemId,
            status: section.isUnlocked ? 'learning' : 'locked',
            score: 0,
            maxScore: 100,
            percentage: 0,
            attempts: 0
        });
        section.totalItems = Math.max(section.totalItems || 0, section.items.length);
        if (sectionType === 'vocabulary' || sectionType === 'grammar') {
            const expectedItems = buildSectionProgress(lesson, sectionType, section.isUnlocked);
            expectedItems.items.forEach(expectedItem => {
                const exists = section.items.some(sectionItem => sectionItem.itemId.toString() === expectedItem.itemId.toString());
                if (!exists) section.items.push(expectedItem);
            });
            section.totalItems = section.items.length;
        }
    }

    const item = section.items.find(sectionItem => sectionItem.itemId.toString() === itemId.toString());
    if (!item) return progress;

    item.status = status;
    item.score = score;
    item.maxScore = maxScore;
    item.percentage = percentage;
    item.attempts = (item.attempts || 0) + 1;
    item.breakdown = breakdown;
    item.lastAccessed = new Date();
    if (status === 'completed') item.completedAt = new Date();
    if (resultId) item.resultRef = { kind: resultKind, refId: resultId };

    progress.resumePoint = {
        section: sectionType,
        moduleType: item.moduleType,
        itemId,
        title
    };
    progress.lastAccessed = new Date();
    await progress.save();
    return progress;
};

export const getLessons = async (req, res) => {
    try {
        const { search, level, isPublished, page = 1, limit = 20 } = req.query;
        const query = applyLessonAccess({}, req.user);

        if (level) query.level = level;
        if (isAdminUser(req.user) && isPublished !== undefined) query.isPublished = isPublished === 'true';
        if (search) {
            query.$or = [
                { code: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const lessons = await Lesson.find(query)
            .populate('finalTest', 'title type passingScore timeLimit isActive sections createdAt updatedAt')
            .sort({ order: 1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Lesson.countDocuments(query);

        return ok(res, {
            lessons,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy danh sách lesson thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách lesson: ' + error.message);
    }
};

export const createLesson = async (req, res) => {
    try {
        const payload = { ...req.body, createdBy: req.user?._id };
        if (payload.order === undefined || payload.order === null) payload.order = await getNextOrder();

        const lesson = await Lesson.create(payload);
        return created(res, lesson, 'Tạo lesson thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi tạo lesson: ' + error.message);
    }
};

export const getLessonById = async (req, res) => {
    try {
        assertObjectId(req.params.lessonId, 'lessonId');
        const query = applyLessonAccess({ _id: req.params.lessonId }, req.user);
        const lesson = await Lesson.findOne(query).populate(lessonPopulate);

        if (!lesson) return notFound(res, 'Không tìm thấy lesson');
        return ok(res, lesson, 'Lấy chi tiết lesson thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi lấy chi tiết lesson: ' + error.message);
    }
};

export const updateLesson = async (req, res) => {
    try {
        assertObjectId(req.params.lessonId, 'lessonId');
        const blockedFields = ['vocabulary', 'vocabularyQuizzes', 'grammar', 'grammarQuizzes', 'listening', 'speaking', 'reading', 'writing', 'finalTest'];
        const payload = { ...req.body };
        blockedFields.forEach(field => delete payload[field]);

        const lesson = await Lesson.findOneAndUpdate(
            { _id: req.params.lessonId, isDeleted: false },
            payload,
            { new: true, runValidators: true }
        );

        if (!lesson) return notFound(res, 'Không tìm thấy lesson để cập nhật');
        return ok(res, lesson, 'Cập nhật lesson thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi cập nhật lesson: ' + error.message);
    }
};

export const deleteLesson = async (req, res) => {
    try {
        assertObjectId(req.params.lessonId, 'lessonId');
        const lesson = await Lesson.findOneAndUpdate(
            { _id: req.params.lessonId, isDeleted: false },
            { isDeleted: true, isPublished: false },
            { new: true }
        );

        if (!lesson) return notFound(res, 'Không tìm thấy lesson để xóa');
        return ok(res, lesson, 'Xóa một lesson thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi xóa lesson: ' + error.message);
    }
};

export const publishLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findOneAndUpdate(
            { _id: req.params.lessonId, isDeleted: false },
            { isPublished: true },
            { new: true }
        );

        if (!lesson) return notFound(res, 'Không tìm thấy lesson');
        return ok(res, lesson, 'Đã publish lesson');
    } catch (error) {
        return serverError(res, 'Lỗi khi publish lesson: ' + error.message);
    }
};

export const unpublishLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findOneAndUpdate(
            { _id: req.params.lessonId, isDeleted: false },
            { isPublished: false },
            { new: true }
        );

        if (!lesson) return notFound(res, 'Không tìm thấy lesson');
        return ok(res, lesson, 'Đã ẩn lesson');
    } catch (error) {
        return serverError(res, 'Lỗi khi ẩn lesson: ' + error.message);
    }
};

export const reorderLessons = async (req, res) => {
    try {
        const { lessons } = req.body || {};
        if (!Array.isArray(lessons) || lessons.length === 0) {
            return badRequest(res, 'lessons phải là mảng gồm lessonId và order');
        }

        const operations = lessons.map(item => {
            assertObjectId(item.lessonId, 'lessonId');
            return {
                updateOne: {
                    filter: { _id: item.lessonId, isDeleted: false },
                    update: { order: Number(item.order) }
                }
            };
        });

        await Lesson.bulkWrite(operations);
        const updatedLessons = await Lesson.find({ isDeleted: false }).sort({ order: 1 });
        return ok(res, updatedLessons, 'Sắp xếp lesson thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi sắp xếp lesson: ' + error.message);
    }
};

export const getLessonProgress = async (req, res) => {
    try {
        assertObjectId(req.params.lessonId, 'lessonId');
        const progress = await LessonProgress.findOne({
            user: req.user._id,
            lesson: req.params.lessonId
        }).populate('lesson', 'code title level order');

        if (!progress) return notFound(res, 'Bạn chưa bắt đầu lesson này');
        return ok(res, progress, 'Lấy tiến độ lesson thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi lấy tiến độ lesson: ' + error.message);
    }
};

export const updateLessonSectionProgress = async (req, res) => {
    try {
        const { lessonId, sectionType, itemId } = req.params;
        assertObjectId(lessonId, 'lessonId');
        assertObjectId(itemId, 'itemId');
        if (!LESSON_SECTIONS.includes(sectionType)) return badRequest(res, 'sectionType không hợp lệ');

        const lesson = await Lesson.findOne(applyLessonAccess({ _id: lessonId }, req.user));
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');

        let progress = await LessonProgress.findOne({ user: req.user._id, lesson: lesson._id });
        if (!progress) progress = new LessonProgress(buildInitialProgress(lesson, req.user._id));

        const section = progress.sections[sectionType];
        if (!section || !section.isUnlocked) return badRequest(res, 'Phần học này chưa được mở');

        const item = section.items.find(sectionItem => sectionItem.itemId.toString() === itemId);
        if (!item) return notFound(res, 'Không tìm thấy item trong tiến độ lesson');

        const {
            status = 'completed',
            score,
            maxScore = 100,
            percentage,
            resultKind = 'Manual',
            resultId,
            breakdown,
            title
        } = req.body || {};

        if (!['learning', 'completed'].includes(status)) return badRequest(res, 'status chỉ nhận learning hoặc completed');
        if (!RESULT_REF_KINDS.includes(resultKind)) return badRequest(res, 'resultKind không hợp lệ');

        const nextScore = Number(score ?? percentage ?? 0);
        const nextMaxScore = Number(maxScore || 100);
        const nextPercentage = percentage !== undefined
            ? Number(percentage)
            : (nextMaxScore > 0 ? Math.round((nextScore / nextMaxScore) * 100) : 0);

        item.status = status;
        item.score = nextScore;
        item.maxScore = nextMaxScore;
        item.percentage = nextPercentage;
        item.attempts = (item.attempts || 0) + 1;
        item.breakdown = breakdown;
        item.lastAccessed = new Date();
        if (status === 'completed') item.completedAt = new Date();
        if (resultId) {
            assertObjectId(resultId, 'resultId');
            item.resultRef = { kind: resultKind, refId: resultId };
        }

        progress.resumePoint = {
            section: sectionType,
            moduleType: item.moduleType,
            itemId,
            title
        };
        progress.lastAccessed = new Date();
        await progress.save();

        return ok(res, progress, 'Cập nhật tiến độ phần học thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi cập nhật tiến độ phần học: ' + error.message);
    }
};

export const getLessonSkillItem = async (req, res) => {
    try {
        const { lessonId, sectionType, itemId } = req.params;
        assertObjectId(lessonId, 'lessonId');
        assertObjectId(itemId, 'itemId');

        const Model = SKILL_MODULES[sectionType];
        if (!Model) return badRequest(res, 'sectionType không hợp lệ');

        const lesson = await Lesson.findOne(applyLessonAccess({ _id: lessonId }, req.user));
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');
        if (!assertLessonHasSkillItem(lesson, sectionType, itemId)) {
            return notFound(res, 'Item không thuộc lesson này');
        }

        const item = await Model.findById(itemId);
        if (!item) return notFound(res, 'Không tìm thấy item');

        const data = ['listening', 'reading'].includes(sectionType) ? stripItemAnswers(item) : item;
        return ok(res, data, 'Lấy bài kỹ năng thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi lấy bài kỹ năng: ' + error.message);
    }
};

export const submitLessonSkillItem = async (req, res) => {
    try {
        const { lessonId, sectionType, itemId } = req.params;
        assertObjectId(lessonId, 'lessonId');
        assertObjectId(itemId, 'itemId');

        const Model = SKILL_MODULES[sectionType];
        if (!Model) return badRequest(res, 'sectionType không hợp lệ');

        const lesson = await Lesson.findOne(applyLessonAccess({ _id: lessonId }, req.user));
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');
        if (!assertLessonHasSkillItem(lesson, sectionType, itemId)) {
            return notFound(res, 'Item không thuộc lesson này');
        }

        const item = await Model.findById(itemId);
        if (!item) return notFound(res, 'Không tìm thấy item');

        if (['reading', 'listening'].includes(sectionType)) {
            const answers = req.body?.answers;
            if (!Array.isArray(answers)) return badRequest(res, 'answers phải là một mảng');

            let totalScore = 0;
            let maxScore = 0;
            const answerResults = (item.questions || []).map(question => {
                const submitted = answers.find(answer => String(answer.questionId) === String(question._id));
                const maxPoints = question.points || 0;
                const isCorrect = isSkillAnswerCorrect(submitted?.answer, question.correctAnswer);
                const points = isCorrect ? maxPoints : 0;
                const category = getQuestionCategory(sectionType, question);

                totalScore += points;
                maxScore += maxPoints;

                return {
                    questionId: question._id,
                    userAnswer: submitted?.answer,
                    correctAnswer: question.correctAnswer,
                    isCorrect,
                    points,
                    maxPoints,
                    category
                };
            });

            const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
            const breakdown = req.body?.breakdown || buildBreakdown(answerResults);

            const result = await LessonSkillResult.create({
                user: req.user._id,
                lesson: lesson._id,
                sectionType,
                itemId,
                answers: answerResults,
                totalScore,
                maxScore,
                percentage,
                breakdown,
                timeSpent: req.body?.timeSpent || 0,
                submittedAt: new Date()
            });

            const progress = await updateProgressItemResult({
                userId: req.user._id,
                lesson,
                sectionType,
                itemId,
                percentage,
                score: totalScore,
                maxScore,
                resultKind: 'Manual',
                resultId: result._id,
                breakdown,
                title: item.title
            });

            return ok(res, { result, progress }, 'Nộp bài kỹ năng thành công');
        }

        if (sectionType === 'writing') {
            const content = req.body?.content || '';
            if (!content.trim()) return badRequest(res, 'Nội dung bài viết không được để trống');

            const submission = await WritingSubmission.create({
                user: req.user._id,
                lesson: lesson._id,
                writing: item._id,
                content,
                wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
                charCount: content.length,
                timeSpent: req.body?.timeSpent || 0,
                status: 'pending_ai'
            });

            let aiResult;
            try {
                aiResult = await evaluateWritingWithAI(
                    item.title || 'Chủ đề tự do',
                    item.prompt || item.instruction || '',
                    content
                );

                submission.evaluation = {
                    totalScore: aiResult.score,
                    aiFeedback: aiResult.feedback,
                    detailedCorrection: aiResult.detailedCorrection
                };
                submission.status = 'evaluated';
                await submission.save();
            } catch (aiError) {
                submission.status = 'ai_failed';
                await submission.save();
                return serverError(res, 'Lỗi khi AI chấm bài viết: ' + aiError.message);
            }

            const totalScore = Number(aiResult?.score || 0);
            const maxScore = 50;
            const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
            const progress = await updateProgressItemResult({
                userId: req.user._id,
                lesson,
                sectionType,
                itemId,
                status: 'completed',
                percentage,
                score: totalScore,
                maxScore,
                resultKind: 'WritingSubmission',
                resultId: submission._id,
                breakdown: {
                    feedback: aiResult?.feedback,
                    detailedCorrection: aiResult?.detailedCorrection
                },
                title: item.title
            });

            return created(res, { submission, aiResult, progress }, 'Nộp bài viết và chấm AI thành công');
        }

        if (sectionType === 'speaking') {
            const { audioUrl, recordingDuration, fileSize } = req.body || {};
            if (!audioUrl) return badRequest(res, 'Thiếu audioUrl');
            if (recordingDuration === undefined) return badRequest(res, 'Thiếu recordingDuration');

            const hasEvaluation = isAdminUser(req.user) && Boolean(req.body?.evaluation || req.body?.aiEvaluation);
            const evaluation = hasEvaluation ? normalizeSpeakingEvaluation(req.body) : undefined;
            if (hasEvaluation && !evaluation.percentage && !evaluation.score) {
                return badRequest(res, 'Thiếu điểm chấm bài nói');
            }

            const submission = await SpeakingSubmission.create({
                student: req.user._id,
                lesson: lesson._id,
                speaking: item._id,
                audioUrl,
                recordingDuration,
                fileSize,
                status: hasEvaluation ? 'evaluated' : 'pending_ai',
                evaluation: hasEvaluation
                    ? {
                        ...evaluation,
                        evaluatedBy: req.user._id,
                        evaluatedAt: new Date()
                    }
                    : undefined
            });

            if (hasEvaluation) {
                await updateSpeakingPracticeProgress({
                    userId: req.user._id,
                    lessonId: lesson._id,
                    speakingId: item._id,
                    submission,
                    evaluation
                });

                const progress = await updateProgressItemResult({
                    userId: req.user._id,
                    lesson,
                    sectionType,
                    itemId,
                    status: 'completed',
                    percentage: evaluation.percentage,
                    score: evaluation.percentage,
                    maxScore: 100,
                    resultKind: 'SpeakingSubmission',
                    resultId: submission._id,
                    breakdown: {
                        pronunciation: evaluation.pronunciation,
                        intonation: evaluation.intonation,
                        accuracy: evaluation.accuracy,
                        fluency: evaluation.fluency
                    },
                    title: item.title
                });

                return created(res, { submission, progress }, 'Nộp và chấm bài nói thành công');
            }

            try {
                const aiEvaluation = await assessSpeakingSubmission({ submission, speaking: item });
                const { progress } = await applySpeakingEvaluation({
                    userId: req.user._id,
                    lesson,
                    item,
                    itemId,
                    submission,
                    evaluationPayload: aiEvaluation
                });

                return created(res, { submission, aiEvaluation, progress }, 'Nộp bài nói và chấm AI thành công');
            } catch (aiError) {
                submission.status = 'failed';
                submission.evaluation = {
                    provider: 'salio-speaking-ai',
                    feedback: aiError.message,
                    rawResult: { error: aiError.message },
                    evaluatedAt: new Date()
                };
                await submission.save();

                return serverError(res, 'Lỗi khi AI chấm bài nói: ' + aiError.message);
            }
        }

        return badRequest(res, 'sectionType không hỗ trợ submit');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi nộp bài kỹ năng: ' + error.message);
    }
};

export const submitLessonSpeakingAudio = async (req, res) => {
    try {
        const { lessonId, itemId } = req.params;
        assertObjectId(lessonId, 'lessonId');
        assertObjectId(itemId, 'itemId');

        if (!req.file?.location) {
            return badRequest(res, 'Thiếu file audio bài nói');
        }

        const lesson = await Lesson.findOne(applyLessonAccess({ _id: lessonId }, req.user));
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');
        if (!assertLessonHasSkillItem(lesson, 'speaking', itemId)) {
            return notFound(res, 'Bài nói không thuộc lesson này');
        }

        const item = await Speaking.findById(itemId);
        if (!item) return notFound(res, 'Không tìm thấy bài nói');

        const recordingDuration = Number(req.body?.recordingDuration || 0);
        if (!recordingDuration) return badRequest(res, 'Thiếu recordingDuration');

        const submission = await SpeakingSubmission.create({
            student: req.user._id,
            lesson: lesson._id,
            speaking: item._id,
            audioUrl: req.file.location,
            recordingDuration,
            fileSize: req.file.size,
            status: 'pending_ai'
        });

        await updateProgressItemResult({
            userId: req.user._id,
            lesson,
            sectionType: 'speaking',
            itemId,
            status: 'learning',
            percentage: 0,
            score: 0,
            maxScore: 100,
            resultKind: 'SpeakingSubmission',
            resultId: submission._id,
            title: item.title
        });

        try {
            const aiEvaluation = await assessSpeakingSubmission({ submission, speaking: item });
            const { progress } = await applySpeakingEvaluation({
                userId: req.user._id,
                lesson,
                item,
                itemId,
                submission,
                evaluationPayload: aiEvaluation
            });

            return created(res, { submission, aiEvaluation, progress }, 'Upload audio và chấm bài nói thành công');
        } catch (aiError) {
            submission.status = 'failed';
            submission.evaluation = {
                provider: 'salio-speaking-ai',
                feedback: aiError.message,
                rawResult: { error: aiError.message },
                evaluatedAt: new Date()
            };
            await submission.save();

            return serverError(res, 'Lỗi khi AI chấm bài nói: ' + aiError.message);
        }
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi nộp audio bài nói: ' + error.message);
    }
};

export const getLessonSkillResult = async (req, res) => {
    try {
        const { lessonId, sectionType, itemId } = req.params;
        assertObjectId(lessonId, 'lessonId');
        assertObjectId(itemId, 'itemId');

        if (['reading', 'listening'].includes(sectionType)) {
            const result = await LessonSkillResult.findOne({
                user: req.user._id,
                lesson: lessonId,
                sectionType,
                itemId
            }).sort({ submittedAt: -1 });

            if (!result) return notFound(res, 'Chưa có kết quả bài kỹ năng');
            return ok(res, result, 'Lấy kết quả bài kỹ năng thành công');
        }

        if (sectionType === 'writing') {
            const submission = await WritingSubmission.findOne({
                user: req.user._id,
                lesson: lessonId,
                writing: itemId
            }).sort({ createdAt: -1 });

            if (!submission) return notFound(res, 'Chưa có kết quả bài viết');
            return ok(res, submission, 'Lấy kết quả bài viết thành công');
        }

        if (sectionType === 'speaking') {
            const submission = await SpeakingSubmission.findOne({
                student: req.user._id,
                lesson: lessonId,
                speaking: itemId
            }).sort({ submittedAt: -1 });

            if (!submission) return notFound(res, 'Chưa có kết quả bài nói');
            return ok(res, submission, 'Lấy kết quả bài nói thành công');
        }

        return badRequest(res, 'sectionType không hợp lệ');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi lấy kết quả bài kỹ năng: ' + error.message);
    }
};

export const evaluateLessonSpeakingSubmission = async (req, res) => {
    try {
        const { lessonId, itemId, submissionId } = req.params;
        assertObjectId(lessonId, 'lessonId');
        assertObjectId(itemId, 'itemId');
        assertObjectId(submissionId, 'submissionId');

        const lesson = await Lesson.findOne({ _id: lessonId, isDeleted: false });
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');
        if (!assertLessonHasSkillItem(lesson, 'speaking', itemId)) {
            return notFound(res, 'Bài nói không thuộc lesson này');
        }

        const item = await Speaking.findById(itemId);
        if (!item) return notFound(res, 'Không tìm thấy bài nói');

        const submission = await SpeakingSubmission.findOne({
            _id: submissionId,
            lesson: lessonId,
            speaking: itemId
        });
        if (!submission) return notFound(res, 'Không tìm thấy bài nộp nói');

        const evaluation = normalizeSpeakingEvaluation(req.body || {});
        if (!evaluation.percentage && !evaluation.score) {
            return badRequest(res, 'Thiếu điểm chấm bài nói');
        }

        submission.status = 'evaluated';
        submission.evaluation = {
            ...evaluation,
            evaluatedBy: req.user?._id,
            evaluatedAt: new Date()
        };
        submission.wordCount = evaluation.transcript?.trim()
            ? evaluation.transcript.trim().split(/\s+/).length
            : submission.wordCount;
        await submission.save();

        await updateSpeakingPracticeProgress({
            userId: submission.student,
            lessonId: lesson._id,
            speakingId: item._id,
            submission,
            evaluation
        });

        const progress = await updateProgressItemResult({
            userId: submission.student,
            lesson,
            sectionType: 'speaking',
            itemId,
            status: 'completed',
            percentage: evaluation.percentage,
            score: evaluation.percentage,
            maxScore: 100,
            resultKind: 'SpeakingSubmission',
            resultId: submission._id,
            breakdown: {
                pronunciation: evaluation.pronunciation,
                intonation: evaluation.intonation,
                accuracy: evaluation.accuracy,
                fluency: evaluation.fluency
            },
            title: item.title
        });

        return ok(res, { submission, progress }, 'Đã chấm bài nói và cập nhật tiến độ');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi chấm bài nói: ' + error.message);
    }
};

export const startLesson = async (req, res) => {
    try {
        assertObjectId(req.params.lessonId, 'lessonId');
        const lesson = await Lesson.findOne(applyLessonAccess({ _id: req.params.lessonId }, req.user));
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');

        const progress = await ensureLessonProgressForUser({ userId: req.user._id, lesson });

        return ok(res, progress, 'Bắt đầu lesson thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi bắt đầu lesson: ' + error.message);
    }
};

export const completeLesson = async (req, res) => {
    try {
        assertObjectId(req.params.lessonId, 'lessonId');
        const lesson = await Lesson.findOne(applyLessonAccess({ _id: req.params.lessonId }, req.user));
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');

        let progress = await LessonProgress.findOne({ user: req.user._id, lesson: lesson._id });
        if (!progress) progress = new LessonProgress(buildInitialProgress(lesson, req.user._id));

        LESSON_SECTIONS.forEach(sectionName => {
            const section = progress.sections[sectionName];
            if (!section) return;
            section.isUnlocked = true;
            section.completedCount = section.totalItems;
            section.progress = section.totalItems > 0 ? 100 : 0;
            section.items.forEach(item => {
                item.status = 'completed';
                item.score = item.score || 100;
            });
        });

        progress.overallProgress = 100;
        progress.isCompleted = true;
        progress.lastAccessed = new Date();
        await progress.save();

        const userProgress = await UserProgress.initForUser(req.user._id);
        const progressId = progress._id.toString();
        const exists = userProgress.statistics.completedLessons.some(id => id.toString() === progressId);
        if (!exists) {
            userProgress.statistics.completedLessons.push(progress._id);
            await userProgress.save();
        }

        return ok(res, progress, 'Đánh dấu lesson hoàn thành thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi hoàn thành lesson: ' + error.message);
    }
};

export const getLessonModules = async (req, res) => {
    try {
        assertObjectId(req.params.lessonId, 'lessonId');
        const lesson = await Lesson.findOne(applyLessonAccess({ _id: req.params.lessonId }, req.user)).populate(lessonPopulate);
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');

        return ok(res, {
            lessonId: lesson._id,
            vocabulary: lesson.vocabulary,
            vocabularyQuizzes: lesson.vocabularyQuizzes,
            grammar: lesson.grammar,
            grammarQuizzes: lesson.grammarQuizzes,
            listening: lesson.listening,
            speaking: lesson.speaking,
            reading: lesson.reading,
            writing: lesson.writing,
            finalTest: lesson.finalTest
        }, 'Lấy danh sách module của lesson thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi lấy module của lesson: ' + error.message);
    }
};

export const addLessonModule = async (req, res) => {
    try {
        assertObjectId(req.params.lessonId, 'lessonId');
        const { moduleType, moduleId, moduleIds } = req.body || {};
        const config = getModuleConfig(moduleType);
        if (!config) return badRequest(res, 'moduleType không hợp lệ');

        const rawIds = moduleIds || (moduleId ? [moduleId] : []);
        if (!Array.isArray(rawIds) || rawIds.length === 0) return badRequest(res, 'Vui lòng cung cấp moduleId hoặc moduleIds');
        const ids = [...new Set(rawIds.map(id => id.toString()))];
        ids.forEach(id => assertObjectId(id, 'moduleId'));

        const lesson = await Lesson.findOne({ _id: req.params.lessonId, isDeleted: false });
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');

        const existingCount = await config.model.countDocuments({ _id: { $in: ids } });
        if (existingCount !== ids.length) return notFound(res, 'Có module không tồn tại');

        if (config.isArray) {
            lesson[config.field] = addUniqueIds(lesson[config.field], ids);
        } else {
            lesson[config.field] = ids[0];
        }

        await lesson.save();
        const populated = await Lesson.findById(lesson._id).populate(lessonPopulate);
        return ok(res, populated, 'Thêm module vào lesson thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi thêm module vào lesson: ' + error.message);
    }
};

export const removeLessonModule = async (req, res) => {
    try {
        assertObjectId(req.params.lessonId, 'lessonId');
        assertObjectId(req.params.moduleId, 'moduleId');
        const config = getModuleConfig(req.params.moduleType);
        if (!config) return badRequest(res, 'moduleType không hợp lệ');

        const lesson = await Lesson.findOne({ _id: req.params.lessonId, isDeleted: false });
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');

        if (config.isArray) {
            lesson[config.field] = (lesson[config.field] || []).filter(id => id.toString() !== req.params.moduleId);
        } else if (lesson[config.field]?.toString() === req.params.moduleId) {
            lesson[config.field] = undefined;
        }

        await lesson.save();
        const populated = await Lesson.findById(lesson._id).populate(lessonPopulate);
        return ok(res, populated, 'Gỡ module khỏi lesson thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi gỡ module khỏi lesson: ' + error.message);
    }
};

export const getLessonFinalTest = async (req, res) => {
    try {
        const lesson = await getLessonWithFinalTest(req.params.lessonId, req.user);
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');
        if (!lesson.finalTest) return notFound(res, 'Lesson chưa có final test');

        const quiz = await populateFinalTest(Quiz.findById(lesson.finalTest));
        if (!quiz) return notFound(res, 'Không tìm thấy final test');

        const data = isAdminUser(req.user) ? quiz : stripFinalTestAnswers(quiz);
        return ok(res, data, 'Lấy final test của lesson thành công');
    } catch (error) {
        if (error.statusCode === 400) return badRequest(res, error.message);
        return serverError(res, 'Lỗi khi lấy final test: ' + error.message);
    }
};

export const createLessonFinalTest = async (req, res) => {
    try {
        const lesson = await Lesson.findOne({ _id: req.params.lessonId, isDeleted: false });
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');
        if (lesson.finalTest) return badRequest(res, 'Lesson đã có final test');

        const quiz = await getOrCreateFinalTest(lesson, req.user?._id, req.body || {});
        const populated = await populateFinalTest(Quiz.findById(quiz._id));
        return created(res, populated, 'Tạo final test cho lesson thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi tạo final test: ' + error.message);
    }
};

export const assembleLessonFinalTest = async (req, res) => {
    try {
        const { sectionType, itemIds, mode = 'append' } = req.body || {};
        if (!FINAL_TEST_SECTION_TYPES.includes(sectionType)) return badRequest(res, 'sectionType không hợp lệ');
        if (!Array.isArray(itemIds)) return badRequest(res, 'itemIds phải là một mảng');
        if (!['append', 'replace'].includes(mode)) return badRequest(res, 'mode chỉ nhận append hoặc replace');

        const lesson = await Lesson.findOne({ _id: req.params.lessonId, isDeleted: false });
        if (!lesson) return notFound(res, 'Không tìm thấy lesson');

        const quiz = await getOrCreateFinalTest(lesson, req.user?._id);
        quiz.sections[sectionType] = mode === 'replace'
            ? itemIds
            : addUniqueIds(quiz.sections[sectionType], itemIds);
        await quiz.save();

        const populated = await populateFinalTest(Quiz.findById(quiz._id));
        return ok(res, populated, 'Lấy item vào final test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy final test: ' + error.message);
    }
};

export const reorderLessonFinalTestItems = async (req, res) => {
    try {
        const { sectionType, itemIds } = req.body || {};
        if (!FINAL_TEST_SECTION_TYPES.includes(sectionType)) return badRequest(res, 'sectionType không hợp lệ');
        if (!Array.isArray(itemIds)) return badRequest(res, 'itemIds phải là mảng theo thứ tự mới');

        const lesson = await Lesson.findOne({ _id: req.params.lessonId, isDeleted: false });
        if (!lesson || !lesson.finalTest) return notFound(res, 'Lesson chưa có final test');

        const quiz = await Quiz.findById(lesson.finalTest);
        if (!quiz) return notFound(res, 'Không tìm thấy final test');

        const currentIds = quiz.sections[sectionType].map(id => id.toString());
        const nextIds = itemIds.map(id => id.toString());
        const hasSameItems = currentIds.length === nextIds.length && currentIds.every(id => nextIds.includes(id));
        if (!hasSameItems) return badRequest(res, 'itemIds phải chứa đúng các item hiện có trong section');

        quiz.sections[sectionType] = itemIds;
        await quiz.save();

        const populated = await populateFinalTest(Quiz.findById(quiz._id));
        return ok(res, populated, 'Sắp xếp item trong final test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi sắp xếp final test: ' + error.message);
    }
};

export const removeLessonFinalTestItems = async (req, res) => {
    try {
        const { sectionType, itemIds } = req.body || {};
        if (!FINAL_TEST_SECTION_TYPES.includes(sectionType)) return badRequest(res, 'sectionType không hợp lệ');
        if (!Array.isArray(itemIds) || itemIds.length === 0) return badRequest(res, 'itemIds phải là mảng có ít nhất một ID');

        const lesson = await Lesson.findOne({ _id: req.params.lessonId, isDeleted: false });
        if (!lesson || !lesson.finalTest) return notFound(res, 'Lesson chưa có final test');

        const quiz = await Quiz.findById(lesson.finalTest);
        if (!quiz) return notFound(res, 'Không tìm thấy final test');

        const removeIds = itemIds.map(id => id.toString());
        quiz.sections[sectionType] = quiz.sections[sectionType].filter(id => !removeIds.includes(id.toString()));
        await quiz.save();

        const populated = await populateFinalTest(Quiz.findById(quiz._id));
        return ok(res, populated, 'Gỡ item khỏi final test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi gỡ item khỏi final test: ' + error.message);
    }
};

export const startLessonFinalTest = async (req, res) => {
    try {
        const lesson = await Lesson.findOne(applyLessonAccess({ _id: req.params.lessonId }, req.user));
        if (!lesson || !lesson.finalTest) return notFound(res, 'Lesson chưa có final test');

        const progress = await LessonProgress.findOne({ user: req.user._id, lesson: lesson._id });
        if (!progress) return badRequest(res, 'Bạn cần bắt đầu lesson trước khi làm final test');
        if (!progress.finalTestStatus.isUnlocked) {
            return badRequest(res, 'Bạn cần hoàn thành đủ các phần học trước khi mở final test');
        }

        const quiz = await Quiz.findOne({ _id: lesson.finalTest, type: 'lesson_final', isActive: true });
        if (!quiz) return notFound(res, 'Final test chưa được publish');
        if (countFinalTestItems(quiz) === 0) return badRequest(res, 'Final test chưa có câu hỏi');

        const session = await QuizSession.create({
            user: req.user._id,
            quiz: quiz._id,
            purpose: 'lesson_final',
            status: 'in_progress',
            startedAt: new Date()
        });

        return created(res, { sessionId: session._id }, 'Bắt đầu final test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi bắt đầu final test: ' + error.message);
    }
};

export const getLessonFinalTestSession = async (req, res) => {
    try {
        const session = await QuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id,
            purpose: 'lesson_final'
        }).lean();
        if (!session) return notFound(res, 'Không tìm thấy phiên final test');

        const quiz = await populateFinalTest(Quiz.findOne({
            _id: session.quiz,
            lesson: req.params.lessonId,
            type: 'lesson_final'
        }));
        if (!quiz) return notFound(res, 'Không tìm thấy final test');

        return ok(res, { session, quiz: stripFinalTestAnswers(quiz) }, 'Lấy phiên final test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy phiên final test: ' + error.message);
    }
};

export const saveLessonFinalTestAnswer = async (req, res) => {
    try {
        const { sectionType = 'quiz', itemId, questionId, answer, timeSpent } = req.body || {};
        if (!['quiz', ...FINAL_TEST_SECTION_TYPES].includes(sectionType)) return badRequest(res, 'sectionType không hợp lệ');
        if (!questionId) return badRequest(res, 'Thiếu questionId');
        if (sectionType !== 'quiz' && !itemId) return badRequest(res, 'Thiếu itemId');

        const session = await QuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id,
            purpose: 'lesson_final',
            status: 'in_progress'
        });
        if (!session) return notFound(res, 'Không tìm thấy phiên final test đang làm');

        const existingIndex = session.answers.findIndex(answerItem => answerItem.questionId.toString() === questionId);
        const answerData = { sectionType, itemId, questionId, userAnswer: answer, isCorrect: false, points: 0 };
        if (existingIndex >= 0) {
            session.answers[existingIndex].set(answerData);
        } else {
            session.answers.push(answerData);
        }

        if (timeSpent !== undefined) session.timeSpent = timeSpent;
        await session.save();

        return ok(res, null, 'Lưu đáp án final test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lưu đáp án final test: ' + error.message);
    }
};

export const submitLessonFinalTestSession = async (req, res) => {
    try {
        const { timeSpent } = req.body || {};
        const session = await QuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id,
            purpose: 'lesson_final'
        });
        if (!session) return notFound(res, 'Không tìm thấy phiên final test');
        if (session.status !== 'in_progress') return badRequest(res, 'Phiên final test này đã được nộp');

        const quiz = await populateFinalTest(Quiz.findOne({
            _id: session.quiz,
            lesson: req.params.lessonId,
            type: 'lesson_final'
        }));
        if (!quiz) return notFound(res, 'Không tìm thấy final test');

        const gradableQuestions = collectFinalTestQuestions(quiz);
        let totalScore = 0;
        let maxScore = 0;

        gradableQuestions.forEach(({ question }) => {
            maxScore += question.points || 0;
        });

        session.answers.forEach(answerItem => {
            const matched = gradableQuestions.find(({ question }) => question._id.toString() === answerItem.questionId.toString());
            if (!matched) return;

            const points = matched.question.points || 0;
            const correct = isFinalAnswerCorrect(answerItem.userAnswer, matched.question.correctAnswer);
            answerItem.isCorrect = correct;
            answerItem.points = correct ? points : 0;
            totalScore += answerItem.points;
        });

        session.totalScore = totalScore;
        session.maxScore = maxScore;
        session.percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        session.passed = session.percentage >= (quiz.passingScore || 0);
        session.status = 'completed';
        session.submittedAt = new Date();
        if (timeSpent !== undefined) session.timeSpent = timeSpent;
        await session.save();

        const progress = await LessonProgress.findOne({ user: req.user._id, lesson: req.params.lessonId });
        if (progress) {
            progress.finalTestStatus.isPassed = session.passed;
            progress.finalTestStatus.highestScore = Math.max(progress.finalTestStatus.highestScore || 0, session.percentage);
            progress.finalTestStatus.attempts = (progress.finalTestStatus.attempts || 0) + 1;
            progress.finalTestStatus.lastSession = session._id;
            if (session.passed) progress.finalTestStatus.passedAt = new Date();
            await progress.save();
        }

        if (session.passed) {
            const lesson = await Lesson.findById(req.params.lessonId).select('order');
            const nextLesson = await Lesson.findOne({
                isDeleted: false,
                isPublished: true,
                order: { $gt: lesson.order }
            }).sort({ order: 1 });

            if (nextLesson) {
                const existingNextProgress = await LessonProgress.findOne({
                    user: req.user._id,
                    lesson: nextLesson._id
                });

                if (!existingNextProgress) {
                    await LessonProgress.create(buildInitialProgress(nextLesson, req.user._id));
                } else {
                    existingNextProgress.isUnlocked = true;
                    await existingNextProgress.save();
                }
            }
        }

        return ok(res, session, 'Nộp final test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi nộp final test: ' + error.message);
    }
};

export const getLessonFinalTestResult = async (req, res) => {
    try {
        const session = await QuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id,
            purpose: 'lesson_final'
        }).lean();

        if (!session) return notFound(res, 'Không tìm thấy kết quả final test');
        if (session.status !== 'completed') return badRequest(res, 'Final test chưa được nộp');

        const quiz = await populateFinalTest(Quiz.findOne({
            _id: session.quiz,
            lesson: req.params.lessonId,
            type: 'lesson_final'
        }));
        if (!quiz) return notFound(res, 'Không tìm thấy final test');

        return ok(res, { session, quiz }, 'Lấy kết quả final test thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy kết quả final test: ' + error.message);
    }
};

const SKILL_MODULES = {
    listening: Listening,
    speaking: Speaking,
    reading: Reading,
    writing: Writing
};
