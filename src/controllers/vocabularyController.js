import Vocabulary from '../models/Vocabulary.js';
import VocabularyQuiz from '../models/VocabularyQuiz.js';
import VocabularyProgress from '../models/VocabularyProgress.js';
import VocabularyQuizSession from '../models/VocabularyQuizSession.js';
import FlashcardSet from '../models/FlashcardSet.js';
import UserProgress from '../models/UserProgress.js';
import { ok, created, badRequest, notFound, serverError, conflict } from '../utils/response.js';
import xlsx from 'xlsx';
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../middlewares/upload.js";

const REVIEW_INTERVALS = {
    learning: 1,
    forgotten: 0,
    remembered: 3
};

const normalizeAnswer = (value) => {
    if (Array.isArray(value)) return value.map(item => String(item).trim().toLowerCase()).sort();
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
};

const isAnswerCorrect = (userAnswer, correctAnswer) => {
    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);
    return JSON.stringify(normalizedUser) === JSON.stringify(normalizedCorrect);
};

const nextReviewDate = (status) => {
    const days = REVIEW_INTERVALS[status] ?? 1;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

const stripVocabularyQuizAnswers = (session) => {
    const data = session.toObject ? session.toObject() : session;
    data.questions?.forEach(questionItem => {
        if (questionItem.question) {
            delete questionItem.question.correctAnswer;
            delete questionItem.question.explanation;
        }
        delete questionItem.isCorrect;
    });
    return data;
};

const updateVocabularyProgress = async ({ userId, vocabularyId, isCorrect, answer }) => {
    if (!vocabularyId) return null;

    const status = isCorrect ? 'remembered' : 'forgotten';
    const update = {
        $set: {
            status,
            lastAnswer: answer,
            lastReviewedAt: new Date(),
            nextReviewAt: nextReviewDate(status)
        },
        $inc: {
            reviewCount: 1,
            correctCount: isCorrect ? 1 : 0,
            wrongCount: isCorrect ? 0 : 1
        }
    };

    return VocabularyProgress.findOneAndUpdate(
        { user: userId, vocabulary: vocabularyId },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

/**
 * GET /api/v1/vocabularies
 * Lấy danh sách từ vựng (Có phân trang, filter level, category, keyword)
 */
export const getVocabularies = async (req, res) => {
    try {
        const { page = 1, limit = 20, level, category, search, isActive } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const query = {};

        if (level) query.level = level;
        if (category) query.category = category;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        
        // Tìm kiếm theo từ khóa (word) hoặc nghĩa (meaning)
        if (search) {
            query.$or = [
                { word: { $regex: search, $options: 'i' } },
                { meaning: { $regex: search, $options: 'i' } }
            ];
        }

        const vocabularies = await Vocabulary.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Vocabulary.countDocuments(query);

        return ok(res, {
            vocabularies,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy danh sách từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách từ vựng: ' + error.message);
    }
};

/**
 * POST /api/v1/vocabularies
 * Thêm từ vựng mới vào kho
 */
export const createVocabulary = async (req, res) => {
    try {
        const { word, meaning } = req.body;
        if (!word || !meaning) {
            return badRequest(res, 'Vui lòng cung cấp từ vựng và nghĩa');
        }

        // Kiểm tra từ vựng đã tồn tại chưa (dựa trên trường 'word')
        const existingVocab = await Vocabulary.findOne({ word: word.trim() });
        if (existingVocab) {
            return conflict(res, `Từ vựng "${word}" đã tồn tại trong hệ thống.`);
        }

        const newVocab = await Vocabulary.create(req.body);
        return created(res, newVocab, 'Thêm từ vựng mới thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi thêm từ vựng: ' + error.message);
    }
};

/**
 * GET /api/v1/vocabularies/:id
 * Xem chi tiết một từ vựng
 */
export const getVocabularyById = async (req, res) => {
    try {
        const vocab = await Vocabulary.findById(req.params.id);
        if (!vocab) return notFound(res, 'Không tìm thấy từ vựng');

        return ok(res, vocab, 'Lấy chi tiết từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết từ vựng: ' + error.message);
    }
};

/**
 * GET /api/v1/vocabularies/study-queue
 * Lấy danh sách từ cần học/ôn lại, kèm trạng thái nhớ của user.
 */
export const getVocabularyStudyQueue = async (req, res) => {
    try {
        const { level, category, status, limit = 20 } = req.query;
        const vocabQuery = { isActive: true };
        if (level) vocabQuery.level = level;
        if (category) vocabQuery.category = category;

        const vocabularies = await Vocabulary.find(vocabQuery)
            .sort({ createdAt: -1 })
            .limit(Math.min(Number(limit), 100))
            .lean();

        const vocabIds = vocabularies.map(vocab => vocab._id);
        const progressItems = await VocabularyProgress.find({
            user: req.user._id,
            vocabulary: { $in: vocabIds }
        }).lean();

        const progressByVocab = new Map(progressItems.map(item => [item.vocabulary.toString(), item]));
        let queue = vocabularies.map(vocab => ({
            ...vocab,
            learningStatus: progressByVocab.get(vocab._id.toString()) || {
                status: 'learning',
                reviewCount: 0,
                correctCount: 0,
                wrongCount: 0
            }
        }));

        if (status) {
            queue = queue.filter(item => item.learningStatus.status === status);
        }

        return ok(res, queue, 'Lấy danh sách từ vựng cần học thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách học từ vựng: ' + error.message);
    }
};

/**
 * GET /api/v1/vocabularies/learning-progress
 * Xem tiến độ học từ vựng của user.
 */
export const getVocabularyLearningProgress = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = { user: req.user._id };
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const progress = await VocabularyProgress.find(query)
            .populate('vocabulary')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await VocabularyProgress.countDocuments(query);

        return ok(res, {
            progress,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy tiến độ học từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy tiến độ học từ vựng: ' + error.message);
    }
};

/**
 * POST /api/v1/vocabularies/:id/mark
 * Đánh dấu một từ là nhớ/chưa nhớ/đang học.
 */
export const markVocabularyLearningStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, answer } = req.body || {};
        const validStatuses = ['learning', 'remembered', 'forgotten'];
        if (!validStatuses.includes(status)) return badRequest(res, 'status không hợp lệ');

        const vocab = await Vocabulary.findById(id);
        if (!vocab) return notFound(res, 'Không tìm thấy từ vựng');

        const progress = await VocabularyProgress.findOneAndUpdate(
            { user: req.user._id, vocabulary: id },
            {
                $set: {
                    status,
                    lastAnswer: answer,
                    lastReviewedAt: new Date(),
                    nextReviewAt: nextReviewDate(status)
                },
                $inc: {
                    reviewCount: 1,
                    correctCount: status === 'remembered' ? 1 : 0,
                    wrongCount: status === 'forgotten' ? 1 : 0
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).populate('vocabulary');

        return ok(res, progress, 'Cập nhật trạng thái học từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật trạng thái học từ vựng: ' + error.message);
    }
};

const stripVocabularyQuizConfigAnswers = (quiz) => {
    const data = quiz.toObject ? quiz.toObject() : quiz;
    data.questions?.forEach(item => {
        if (item.question) {
            delete item.question.correctAnswer;
            delete item.question.explanation;
        }
    });
    return data;
};

const snapshotVocabularyQuizQuestions = (quiz, limit) => {
    const allowedTypes = ['single_choice', 'short_answer'];
    const questions = (quiz.items || []).flatMap(item => (
        (item.questions || [])
            .filter(question => allowedTypes.includes(question.type))
            .map(question => ({
                vocabulary: item.vocabulary,
                question
            }))
    ));

    return questions
        .slice(0, Math.min(Number(limit), 50))
        .map(item => item);
};

const buildVocabularyQuizQuery = ({ quizId, level, category }) => {
    if (quizId) return { _id: quizId, isActive: true };
    const query = { isActive: true };
    if (level) query.level = level;
    if (category) query.category = category;
    return query;
};

export const getVocabularyQuizzes = async (req, res) => {
    try {
        const { level, category, isActive, page = 1, limit = 10 } = req.query;
        const query = {};
        if (level) query.level = level;
        if (category) query.category = category;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const skip = (Number(page) - 1) * Number(limit);
        const quizzes = await VocabularyQuiz.find(query)
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await VocabularyQuiz.countDocuments(query);

        return ok(res, {
            quizzes,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy danh sách quiz từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách quiz từ vựng: ' + error.message);
    }
};

export const createVocabularyQuiz = async (req, res) => {
    try {
        const { title, itemIds, items } = req.body || {};
        if (!title) return badRequest(res, 'Vui lòng cung cấp title');

        const quiz = await VocabularyQuiz.create({
            ...req.body,
            items: itemIds || items || [],
            createdBy: req.user?._id
        });

        return created(res, quiz, 'Tạo quiz từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi tạo quiz từ vựng: ' + error.message);
    }
};

export const getVocabularyQuizById = async (req, res) => {
    try {
        const quiz = await VocabularyQuiz.findById(req.params.quizId)
            .populate({
                path: 'items',
                populate: { path: 'vocabulary', select: 'word meaning pronunciationText imageUrl level category' }
            })
            .populate('createdBy', 'username email');

        if (!quiz) return notFound(res, 'Không tìm thấy quiz từ vựng');
        return ok(res, quiz, 'Lấy chi tiết quiz từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết quiz từ vựng: ' + error.message);
    }
};

export const updateVocabularyQuiz = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.itemIds) {
            payload.items = payload.itemIds;
            delete payload.itemIds;
        }

        const quiz = await VocabularyQuiz.findByIdAndUpdate(
            req.params.quizId,
            payload,
            { returnDocument: 'after', runValidators: true }
        );

        if (!quiz) return notFound(res, 'Không tìm thấy quiz từ vựng để cập nhật');
        return ok(res, quiz, 'Cập nhật quiz từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật quiz từ vựng: ' + error.message);
    }
};

export const addVocabularyQuizItems = async (req, res) => {
    try {
        const { itemIds } = req.body || {};
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return badRequest(res, 'itemIds phải là mảng có ít nhất một item');
        }

        const quiz = await VocabularyQuiz.findById(req.params.quizId);
        if (!quiz) return notFound(res, 'Không tìm thấy quiz từ vựng');

        const currentIds = quiz.items.map(id => id.toString());
        itemIds.forEach(itemId => {
            const stringId = itemId.toString();
            if (!currentIds.includes(stringId)) {
                quiz.items.push(itemId);
                currentIds.push(stringId);
            }
        });

        await quiz.save();
        const populated = await VocabularyQuiz.findById(quiz._id).populate({
            path: 'items',
            populate: { path: 'vocabulary', select: 'word meaning pronunciationText imageUrl level category' }
        });

        return ok(res, populated, 'Đã thêm question vocabulary vào quiz');
    } catch (error) {
        return serverError(res, 'Lỗi khi thêm question vocabulary vào quiz: ' + error.message);
    }
};

export const removeVocabularyQuizItems = async (req, res) => {
    try {
        const { itemIds } = req.body || {};
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return badRequest(res, 'itemIds phải là mảng có ít nhất một item');
        }

        const quiz = await VocabularyQuiz.findById(req.params.quizId);
        if (!quiz) return notFound(res, 'Không tìm thấy quiz từ vựng');

        const removeIds = itemIds.map(id => id.toString());
        quiz.items = quiz.items.filter(itemId => !removeIds.includes(itemId.toString()));
        await quiz.save();

        const populated = await VocabularyQuiz.findById(quiz._id).populate({
            path: 'items',
            populate: { path: 'vocabulary', select: 'word meaning pronunciationText imageUrl level category' }
        });

        return ok(res, populated, 'Đã xóa question vocabulary khỏi quiz');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa question vocabulary khỏi quiz: ' + error.message);
    }
};

export const reorderVocabularyQuizItems = async (req, res) => {
    try {
        const { itemIds } = req.body || {};
        if (!Array.isArray(itemIds)) return badRequest(res, 'itemIds phải là mảng theo thứ tự mới');

        const quiz = await VocabularyQuiz.findById(req.params.quizId);
        if (!quiz) return notFound(res, 'Không tìm thấy quiz từ vựng');

        const currentIds = quiz.items.map(id => id.toString());
        const nextIds = itemIds.map(id => id.toString());
        const hasSameItems = currentIds.length === nextIds.length && currentIds.every(id => nextIds.includes(id));
        if (!hasSameItems) return badRequest(res, 'itemIds phải chứa đúng các item hiện có trong quiz');

        quiz.items = itemIds;
        await quiz.save();

        const populated = await VocabularyQuiz.findById(quiz._id).populate({
            path: 'items',
            populate: { path: 'vocabulary', select: 'word meaning pronunciationText imageUrl level category' }
        });

        return ok(res, populated, 'Đã sắp xếp lại question vocabulary trong quiz');
    } catch (error) {
        return serverError(res, 'Lỗi khi sắp xếp question vocabulary trong quiz: ' + error.message);
    }
};

export const deleteVocabularyQuiz = async (req, res) => {
    try {
        const usedSession = await VocabularyQuizSession.findOne({ quiz: req.params.quizId });
        if (usedSession) return badRequest(res, 'Không thể xóa quiz đã có phiên làm bài');

        const quiz = await VocabularyQuiz.findByIdAndDelete(req.params.quizId);
        if (!quiz) return notFound(res, 'Không tìm thấy quiz từ vựng để xóa');
        return ok(res, null, 'Xóa quiz từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa quiz từ vựng: ' + error.message);
    }
};

export const togglePublishVocabularyQuiz = async (req, res) => {
    try {
        const quiz = await VocabularyQuiz.findById(req.params.quizId);
        if (!quiz) return notFound(res, 'Không tìm thấy quiz từ vựng');
        if (!quiz.isActive && quiz.items.length === 0) {
            return badRequest(res, 'Quiz chưa có câu hỏi nên không thể publish');
        }

        quiz.isActive = !quiz.isActive;
        await quiz.save();
        return ok(res, quiz, quiz.isActive ? 'Đã publish quiz từ vựng' : 'Đã ẩn quiz từ vựng');
    } catch (error) {
        return serverError(res, 'Lỗi khi đổi trạng thái quiz từ vựng: ' + error.message);
    }
};

/**
 * POST /api/v1/vocabularies/quiz/start
 * Bắt đầu quiz kiểm tra từ vựng từ VocabularyQuiz đã được admin cấu hình riêng.
 */
export const startVocabularyQuiz = async (req, res) => {
    try {
        const { quizId, level, category, limit = 50 } = req.body || {};
        const query = buildVocabularyQuizQuery({ quizId, level, category });

        const quiz = await VocabularyQuiz.findOne(query)
            .populate('items')
            .sort({ updatedAt: -1 });
        if (!quiz) return notFound(res, 'Không tìm thấy quiz từ vựng đang hoạt động');

        const questions = snapshotVocabularyQuizQuestions(quiz, limit);
        if (questions.length === 0) {
            return badRequest(res, 'Quiz từ vựng chưa có câu hỏi hợp lệ. Chỉ hỗ trợ single_choice và short_answer');
        }

        const session = await VocabularyQuizSession.create({
            user: req.user._id,
            quiz: quiz._id,
            questions,
            maxScore: questions.reduce((sum, questionItem) => sum + (questionItem.question.points || 0), 0),
            startedAt: new Date()
        });

        return created(res, { sessionId: session._id }, 'Đã bắt đầu quiz từ vựng');
    } catch (error) {
        return serverError(res, 'Lỗi khi bắt đầu quiz từ vựng: ' + error.message);
    }
};

/**
 * GET /api/v1/vocabularies/quiz/session/:sessionId
 * Lấy phiên quiz đang làm, không lộ đáp án.
 */
export const getVocabularyQuizSession = async (req, res) => {
    try {
        const session = await VocabularyQuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id
        }).populate('questions.vocabulary', 'word meaning pronunciationText imageUrl level category');

        if (!session) return notFound(res, 'Không tìm thấy phiên quiz từ vựng');
        return ok(res, stripVocabularyQuizAnswers(session), 'Lấy phiên quiz từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy phiên quiz từ vựng: ' + error.message);
    }
};

/**
 * POST /api/v1/vocabularies/quiz/session/:sessionId/save-answer
 * Lưu đáp án tạm thời.
 */
export const saveVocabularyQuizAnswer = async (req, res) => {
    try {
        const { questionId, answer, timeSpent } = req.body || {};
        if (!questionId) return badRequest(res, 'Thiếu questionId');

        const session = await VocabularyQuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id,
            status: 'in_progress'
        });

        if (!session) return notFound(res, 'Không tìm thấy phiên quiz từ vựng đang làm');

        const question = session.questions.id(questionId);
        if (!question) return notFound(res, 'Không tìm thấy câu hỏi trong phiên quiz');

        question.userAnswer = answer;
        if (timeSpent !== undefined) session.timeSpent = timeSpent;
        await session.save();

        return ok(res, null, 'Đã lưu đáp án quiz từ vựng');
    } catch (error) {
        return serverError(res, 'Lỗi khi lưu đáp án quiz từ vựng: ' + error.message);
    }
};

/**
 * POST /api/v1/vocabularies/quiz/session/:sessionId/submit
 * Nộp quiz và chấm điểm.
 */
export const submitVocabularyQuiz = async (req, res) => {
    try {
        const { timeSpent } = req.body || {};
        const session = await VocabularyQuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id
        });

        if (!session) return notFound(res, 'Không tìm thấy phiên quiz từ vựng');
        if (session.status !== 'in_progress') return badRequest(res, 'Phiên quiz này đã được nộp');

        let totalScore = 0;
        let maxScore = 0;

        for (const questionItem of session.questions) {
            maxScore += questionItem.question.points || 0;
            const correct = isAnswerCorrect(questionItem.userAnswer, questionItem.question.correctAnswer);
            questionItem.isCorrect = correct;
            totalScore += correct ? (questionItem.question.points || 0) : 0;

            await updateVocabularyProgress({
                userId: req.user._id,
                vocabularyId: questionItem.vocabulary,
                isCorrect: correct,
                answer: questionItem.userAnswer
            });
        }

        session.totalScore = totalScore;
        session.maxScore = maxScore;
        session.percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        session.status = 'completed';
        session.submittedAt = new Date();
        if (timeSpent !== undefined) session.timeSpent = timeSpent;
        await session.save();

        const completedSession = await VocabularyQuizSession.findById(session._id)
            .populate('questions.vocabulary', 'word meaning pronunciationText imageUrl level category');

        return ok(res, completedSession, 'Nộp quiz từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi nộp quiz từ vựng: ' + error.message);
    }
};

/**
 * GET /api/v1/vocabularies/quiz/session/:sessionId/result
 * Xem kết quả quiz từ vựng.
 */
export const getVocabularyQuizResult = async (req, res) => {
    try {
        const session = await VocabularyQuizSession.findOne({
            _id: req.params.sessionId,
            user: req.user._id
        }).populate('questions.vocabulary', 'word meaning pronunciationText imageUrl level category');

        if (!session) return notFound(res, 'Không tìm thấy kết quả quiz từ vựng');
        if (session.status !== 'completed') return badRequest(res, 'Quiz từ vựng chưa được nộp');

        return ok(res, session, 'Lấy kết quả quiz từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy kết quả quiz từ vựng: ' + error.message);
    }
};

/**
 * GET /api/v1/vocabularies/quiz/results
 * Lấy lịch sử kết quả quiz từ vựng.
 */
export const getVocabularyQuizResults = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const sessions = await VocabularyQuizSession.find({
            user: req.user._id,
            status: 'completed'
        })
            .sort({ submittedAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .select('-questions.question.correctAnswer -questions.question.explanation');

        const total = await VocabularyQuizSession.countDocuments({
            user: req.user._id,
            status: 'completed'
        });

        return ok(res, {
            sessions,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy lịch sử quiz từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy lịch sử quiz từ vựng: ' + error.message);
    }
};

/**
 * PATCH /api/v1/vocabularies/:id
 * Cập nhật thông tin từ vựng
 */
export const updateVocabulary = async (req, res) => {
    try {
        const { id } = req.params;
        const oldVocab = await Vocabulary.findById(id);
        
        if (!oldVocab) return notFound(res, 'Không tìm thấy từ vựng để cập nhật');

        // Xóa file ảnh cũ trên S3 nếu có cập nhật đường dẫn ảnh mới (hoặc xóa ảnh)
        if (req.body.imageUrl !== undefined && req.body.imageUrl !== oldVocab.imageUrl) {
            if (oldVocab.imageUrl) {
                try {
                    const parsedUrl = new URL(oldVocab.imageUrl);
                    const key = decodeURIComponent(parsedUrl.pathname.substring(1));
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: key
                    }));
                } catch (s3Err) {
                    console.error('Lỗi khi xóa ảnh cũ trên S3:', s3Err);
                }
            }
        }

        const updatedVocab = await Vocabulary.findByIdAndUpdate(
            id,
            req.body,
            { returnDocument: 'after', runValidators: true }
        );

        return ok(res, updatedVocab, 'Cập nhật từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật từ vựng: ' + error.message);
    }
};

/**
 * PATCH /api/v1/vocabularies/:id/publish
 * Ẩn/Hiện từ vựng (Draft/Published)
 */
export const togglePublishVocabulary = async (req, res) => {
    try {
        const vocab = await Vocabulary.findById(req.params.id);
        if (!vocab) return notFound(res, 'Không tìm thấy từ vựng');

        vocab.isActive = !vocab.isActive;
        await vocab.save();

        const msg = vocab.isActive ? 'Đã hiển thị từ vựng' : 'Đã ẩn từ vựng';
        return ok(res, vocab, msg);
    } catch (error) {
        return serverError(res, 'Lỗi khi thay đổi trạng thái từ vựng: ' + error.message);
    }
};

/**
 * PATCH /api/v1/vocabularies/bulk-images
 * Cập nhật ảnh hàng loạt cho các từ vựng đã có
 */
export const updateBulkImages = async (req, res) => {
    try {
        const { updates } = req.body;
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return badRequest(res, 'Vui lòng cung cấp danh sách dữ liệu cập nhật (mảng updates)');
        }

        let successCount = 0;

        for (const item of updates) {
            const { id, imageUrl } = item;
            if (!id || imageUrl === undefined) continue;

            const vocab = await Vocabulary.findById(id);
            if (!vocab) continue;

            // Xóa ảnh cũ trên S3 nếu bị ghi đè bằng ảnh mới
            if (vocab.imageUrl && vocab.imageUrl !== imageUrl) {
                try {
                    const parsedUrl = new URL(vocab.imageUrl);
                    const key = decodeURIComponent(parsedUrl.pathname.substring(1));
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: key
                    }));
                } catch (s3Err) {
                    console.error('Lỗi khi xóa ảnh cũ trên S3:', s3Err);
                }
            }

            vocab.imageUrl = imageUrl;
            await vocab.save();
            successCount++;
        }

        return ok(res, { successCount }, `Đã cập nhật ảnh thành công cho ${successCount} từ vựng`);
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật ảnh hàng loạt: ' + error.message);
    }
};

/**
 * DELETE /api/v1/vocabularies/:id
 * Xóa từ vựng (Có kiểm tra ràng buộc với FlashcardSet & Danh sách yêu thích)
 */
export const deleteVocabulary = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Kiểm tra xem có bộ Flashcard nào đang chứa từ này không
        const flashcardSetUsingIt = await FlashcardSet.findOne({ cards: id });
        if (flashcardSetUsingIt) {
            return badRequest(res, `Không thể xóa! Từ vựng này đang nằm trong bộ Flashcard: "${flashcardSetUsingIt.name}"`);
        }

        // 2. Kiểm tra xem có học viên nào đang lưu từ này vào mục Yêu thích không
        const userProgressUsingIt = await UserProgress.findOne({ 'statistics.savedVocabularies': id });
        if (userProgressUsingIt) {
            return badRequest(res, 'Không thể xóa! Từ vựng này đang có học viên lưu trong danh sách Yêu thích.');
        }

        const deletedVocab = await Vocabulary.findByIdAndDelete(id);
        if (!deletedVocab) return notFound(res, 'Không tìm thấy từ vựng để xóa');

        // Xóa file ảnh trên S3 nếu từ vựng đó có ảnh đính kèm
        if (deletedVocab.imageUrl) {
            try {
                const parsedUrl = new URL(deletedVocab.imageUrl);
                const key = decodeURIComponent(parsedUrl.pathname.substring(1));
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: key
                }));
            } catch (s3Err) {
                console.error('Lỗi khi xóa ảnh trên S3:', s3Err);
            }
        }

        return ok(res, null, 'Xóa từ vựng thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa từ vựng: ' + error.message);
    }
};

/**
 * POST /api/v1/vocabularies/import
 * Import hàng loạt từ vựng từ file Excel
 */
export const importVocabularies = async (req, res) => {
    try {
        if (!req.file) {
            return badRequest(res, 'Vui lòng tải lên một file Excel (.xlsx, .xls)');
        }

        // 1. Đọc file từ buffer bằng thư viện xlsx (SheetJS)
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        
        // 2. Lấy dữ liệu từ Sheet đầu tiên
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 3. Chuyển đổi thành mảng JSON
        const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawData || rawData.length === 0) {
            return badRequest(res, 'File Excel không có dữ liệu hoặc sai định dạng');
        }

        // --- LOGIC CHỐNG TRÙNG LẶP ---
        // Lấy danh sách tất cả các 'word' từ file Excel
        const wordsFromExcel = [...new Set(
            rawData.map(row => (row['Từ vựng'] || row['word'])?.toString().trim()).filter(Boolean)
        )];

        // Tìm tất cả các từ đã tồn tại trong DB chỉ với 1 query
        const existingDocs = await Vocabulary.find({ word: { $in: wordsFromExcel } }).select('word');
        const existingWords = new Set(existingDocs.map(v => v.word));

        // Lọc ra những dòng dữ liệu chưa có trong DB
        const dataToInsert = rawData.filter(row => {
            const word = (row['Từ vựng'] || row['word'])?.toString().trim();
            return word && !existingWords.has(word);
        });

        const skippedCount = rawData.length - dataToInsert.length;

        if (dataToInsert.length === 0) {
            return ok(res, { importedCount: 0, skippedCount }, `Đã bỏ qua ${skippedCount} từ vựng do đã tồn tại. Không có từ vựng mới nào được thêm.`);
        }

        // Hàm hỗ trợ chuyển đổi Loại từ tiếng Việt (trong file Excel) sang Enum chuẩn của Database
        const mapWordType = (val) => {
            if (!val) return 'noun';
            const str = val.toString().trim().toLowerCase();
            if (str.includes('động') || str === 'verb') return 'verb';
            if (str.includes('tính') || str === 'adjective') return 'adjective';
            if (str.includes('phó') || str.includes('trạng') || str === 'adverb') return 'adverb';
            return 'noun'; // Mặc định là danh từ
        };

        // 4. Map dữ liệu từ file Excel sang schema Vocabulary
        // Cấu trúc File Excel đầy đủ sẽ bao gồm các cột sau:
        // "Từ vựng", "Nghĩa", "Phát âm", "Loại từ", "Cấp độ", "Chủ đề", "Từ Hán Hàn", "Chữ Hán", "Âm Hán Việt", "Hình ảnh", "Ví dụ Hàn", "Ví dụ Việt"
        const vocabularies = dataToInsert.map(row => {
            // Kiểm tra flag Từ Hán Hàn (chấp nhận "có", "true", "1", "x")
            const isSinoVal = row['Từ Hán Hàn']?.toString().trim().toLowerCase();
            const isSinoKorean = ['true', '1', 'yes', 'có', 'x'].includes(isSinoVal);

            // --- XỬ LÝ NHIỀU VÍ DỤ ---
            const examples = [];
            
            // Cách 1: Hỗ trợ xuống dòng (Alt+Enter) trong cùng 1 ô "Ví dụ Hàn" / "Ví dụ Việt"
            if (row['Ví dụ Hàn'] && row['Ví dụ Việt']) {
                const koLines = row['Ví dụ Hàn'].toString().split('\n');
                const viLines = row['Ví dụ Việt'].toString().split('\n');
                const maxLen = Math.min(koLines.length, viLines.length);
                for (let i = 0; i < maxLen; i++) {
                    const k = koLines[i].trim();
                    const v = viLines[i].trim();
                    if (k && v) examples.push({ korean: k, vietnamese: v });
                }
            }

            // Cách 2: Hỗ trợ tạo thêm các cột đánh số (Ví dụ Hàn 1, Ví dụ Việt 1, Ví dụ Hàn 2...)
            for (let i = 1; i <= 5; i++) { // Hỗ trợ tối đa 5 ví dụ chia cột
                const k = row[`Ví dụ Hàn ${i}`]?.toString().trim();
                const v = row[`Ví dụ Việt ${i}`]?.toString().trim();
                if (k && v) {
                    examples.push({ korean: k, vietnamese: v });
                }
            }

            return {
                word: row['Từ vựng']?.toString().trim() || row['word'],
                meaning: row['Nghĩa']?.toString().trim() || row['meaning'],
                pronunciationText: row['Phát âm']?.toString().trim() || row['pronunciationText'],
                type: mapWordType(row['Loại từ'] || row['type']),
                isSinoKorean: isSinoKorean,
                hanja: row['Chữ Hán']?.toString().trim() || row['hanja'],
                sinoVietnamese: row['Âm Hán Việt']?.toString().trim() || row['sinoVietnamese'],
                imageUrl: row['Hình ảnh']?.toString().trim() || row['imageUrl'],
                level: row['Cấp độ']?.toString().trim() || row['level'] || 'Sơ cấp 1',
                category: row['Chủ đề']?.toString().trim() || row['category'],
                examples: examples
            };
        }).filter(vocab => vocab.word && vocab.meaning); // Bỏ qua các dòng trống không có từ và nghĩa

        // Sử dụng ordered: false để nếu có 1 vài record lỗi (VD: thiếu trường required)
        // thì các record đúng vẫn được insert bình thường thay vì crash toàn bộ
        const result = await Vocabulary.insertMany(vocabularies, { ordered: false });

        return created(res, { importedCount: result.length, skippedCount }, `Đã import thành công ${result.length} từ vựng. Bỏ qua ${skippedCount} từ đã tồn tại.`);
    } catch (error) {
        // Bắt lỗi BulkWriteError nếu có
        if (error.name === 'BulkWriteError') {
            return serverError(res, `Đã import được ${error.insertedDocs.length} từ vựng. Có lỗi ở một số bản ghi.`);
        }
        return serverError(res, 'Lỗi khi import từ vựng: ' + error.message);
    }
};
