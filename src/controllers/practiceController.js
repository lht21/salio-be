import Exam from '../models/Exam.js';
import Writing from '../models/Writing.js';
import Speaking from '../models/Speaking.js';
import ExamResult from '../models/ExamResult.js';
import WritingSubmission from '../models/WritingSubmission.js';
import { ok, badRequest, notFound, serverError } from '../utils/response.js';
import { evaluateWritingWithAI } from './gradingController.js';

/**
 * GET /api/v1/practice/:type/sets
 * Rẽ nhánh theo type: reading/listening → query Exam; writing/speaking → query Writing/Speaking
 */
export const getPracticeSets = async (req, res) => {
    try {
        const { type } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        let data = [], total = 0;

        if (['reading', 'listening', 'full'].includes(type)) {
            // Lọc ra các Exam đang active và chứa câu hỏi phần tương ứng
            const query = { isActive: true };
            if (type === 'reading') query['sections.reading.0'] = { $exists: true };
            if (type === 'listening') query['sections.listening.0'] = { $exists: true };
            // Nếu type === 'full', query tất cả các Exam active

            data = await Exam.find(query)
                .select('title examType duration totalScore isPremium createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit));
            total = await Exam.countDocuments(query);
        } else if (type === 'writing') {
            data = await Writing.find({ isActive: true })
                .select('-aiConfig')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit));
            total = await Writing.countDocuments({ isActive: true });
        } else if (type === 'speaking') {
            data = await Speaking.find({ isActive: true })
                .select('-sampleAnswer -sampleTranslation')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit));
            total = await Speaking.countDocuments({ isActive: true });
        } else {
            return badRequest(res, 'Loại bài tập không hợp lệ. Chỉ hỗ trợ: reading, listening, writing, speaking.');
        }

        return ok(res, { data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Lấy danh sách bài tập thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách bài tập: ' + error.message);
    }
};

/**
 * GET /api/v1/practice/:type/sets/:setId
 * Lấy đề làm bài. Bảo mật: strip isCorrect + explanation để Học viên không xem trộm đáp án
 */
export const getPracticeSetById = async (req, res) => {
    try {
        const { type, setId } = req.params;

        if (['reading', 'listening', 'full'].includes(type)) {
            const populatePaths = type === 'full' 
                ? ['sections.listening', 'sections.reading', 'sections.writing'] 
                : [`sections.${type}`];

            const exam = await Exam.findOne({ _id: setId, isActive: true })
                .populate(populatePaths)
                .lean();

            if (!exam) return notFound(res, 'Không tìm thấy đề thi');

            // Bảo mật: Xóa isCorrect và explanation trước khi trả về Client
            const sectionsToStrip = type === 'full' ? ['reading', 'listening'] : [type];
            sectionsToStrip.forEach(sec => {
                if (exam.sections && exam.sections[sec]) {
                    exam.sections[sec].forEach(item => {
                    if (item.questions) {
                        item.questions.forEach(q => {
                            if (q.explanation) delete q.explanation;
                            if (q.correctAnswer) delete q.correctAnswer;
                            if (q.answers) {
                                q.answers.forEach(a => {
                                    if (a.isCorrect !== undefined) delete a.isCorrect;
                                });
                            }
                        });
                    }
                });
            }
            });

            // Bảo mật cho phần Writing nếu là full đề
            if (type === 'full' && exam.sections && exam.sections.writing) {
                exam.sections.writing.forEach(item => {
                    if (item.aiConfig) delete item.aiConfig;
                });
            }

            const resultData = {
                _id: exam._id,
                title: exam.title,
                examType: exam.examType,
                duration: type === 'full' ? exam.duration : exam.duration[type],
                type,
                items: type === 'full' ? exam.sections : exam.sections[type]
            };

            return ok(res, resultData, 'Lấy chi tiết đề thi thành công');
        } else if (type === 'writing') {
            const writing = await Writing.findOne({ _id: setId, isActive: true }).lean();
            if (!writing) return notFound(res, 'Không tìm thấy bài viết');
            
            if (writing.aiConfig) delete writing.aiConfig;
            return ok(res, writing, 'Lấy chi tiết bài viết thành công');
        } else if (type === 'speaking') {
            const speaking = await Speaking.findOne({ _id: setId, isActive: true }).lean();
            if (!speaking) return notFound(res, 'Không tìm thấy bài nói');
            
            if (speaking.sampleAnswer) delete speaking.sampleAnswer;
            if (speaking.sampleTranslation) delete speaking.sampleTranslation;
            return ok(res, speaking, 'Lấy chi tiết bài nói thành công');
        } else {
            return badRequest(res, 'Loại bài tập không hợp lệ');
        }
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết bài tập: ' + error.message);
    }
};

/**
 * GET /api/v1/practice/history
 * Lấy lịch sử toàn bộ các lượt làm bài của cá nhân
 */
export const getPracticeHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Ở mức độ đơn giản, ta lấy ExamResult làm đại diện History
        const history = await ExamResult.find({ user: userId })
            .populate('exam', 'title examType')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await ExamResult.countDocuments({ user: userId });

        return ok(res, { history, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }, 'Lấy lịch sử làm bài thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy lịch sử làm bài: ' + error.message);
    }
};

/**
 * POST /api/v1/practice/:type/sets/:setId/start
 * Bắt đầu lượt làm bài mới, trả về attemptId để tracking cho phiên làm bài
 */
export const startAttempt = async (req, res) => {
    try {
        const { type, setId } = req.params;
        const userId = req.user._id;

        if (['reading', 'listening', 'full'].includes(type)) {
            // Cho phép tạo attempt mới hoặc lấy attempt đang dang dở để resume (nếu muốn)
            const attempt = await ExamResult.create({
                user: userId,
                exam: setId,
                status: 'in_progress',
                startedAt: new Date()
            });
            
            return ok(res, { attemptId: attempt._id, type }, 'Đã bắt đầu làm bài thi');
        } else if (type === 'writing') {
            const submission = await WritingSubmission.create({
                user: userId,
                writing: setId,
                content: '',
                status: 'draft'
            });
            return ok(res, { attemptId: submission._id, type }, 'Đã bắt đầu bài luyện viết');
        } else {
            return badRequest(res, 'Chưa hỗ trợ khởi tạo Tracking cho bài tập này');
        }
    } catch (error) {
        return serverError(res, 'Lỗi khi khởi tạo phiên làm bài: ' + error.message);
    }
};

// ========================================================================= //
// ======================== ATTEMPTS (QUÁ TRÌNH LÀM) ======================= //
// ========================================================================= //

const hasAccess = (req, targetUser) => {
    const isAdmin = ['admin', 'teacher'].includes(req.user.role);
    return isAdmin || req.user._id.toString() === targetUser.toString();
};

export const getAttemptStatus = async (req, res) => {
    try {
        const { attemptId } = req.params;

        let attempt = await ExamResult.findById(attemptId).lean();
        if (attempt) {
            if (!hasAccess(req, attempt.user)) return badRequest(res, 'Không có quyền truy cập');
            return ok(res, attempt, 'Lấy trạng thái bài thi thành công');
        }

        let wSubmission = await WritingSubmission.findById(attemptId).lean();
        if (wSubmission) {
            if (!hasAccess(req, wSubmission.user)) return badRequest(res, 'Không có quyền truy cập');
            return ok(res, wSubmission, 'Lấy trạng thái bài viết thành công');
        }

        return notFound(res, 'Không tìm thấy lượt làm bài');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy trạng thái: ' + error.message);
    }
};

export const saveAnswer = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { type, questionId, answer, timeSpent } = req.body;
        const userId = req.user._id;

        // Xử lý riêng biệt cho môn Viết
        if (type === 'writing') {
            let wSubmission = await WritingSubmission.findOne({ _id: attemptId, user: userId });
            if (wSubmission) {
                if (answer !== undefined) wSubmission.content = answer;
                if (timeSpent) wSubmission.timeSpent = timeSpent;
                await wSubmission.save();
                return ok(res, null, 'Đã lưu bài viết tạm thời');
            }
            
            let attempt = await ExamResult.findOne({ _id: attemptId, user: userId });
            if (attempt) {
                return badRequest(res, 'Bạn đang lưu bài viết vào một phiên thi Full Exam (Chưa hỗ trợ API riêng lẻ). Vui lòng sử dụng attemptId của bài luyện viết độc lập.');
            }

            return notFound(res, 'Không tìm thấy lượt làm bài viết');
        }

        // Xử lý cho Trắc nghiệm (Reading / Listening)
        if (['reading', 'listening'].includes(type)) {
            if (!questionId) return badRequest(res, 'Thiếu questionId cho bài thi trắc nghiệm');
            
            let attempt = await ExamResult.findOne({ _id: attemptId, user: userId });
            if (attempt) {
                const targetArray = type === 'reading' ? attempt.readingAnswers : attempt.listeningAnswers;
                const existingIndex = targetArray.findIndex(a => a.questionId.toString() === questionId);
                
                if (existingIndex !== -1) {
                    targetArray[existingIndex].userAnswer = answer;
                } else {
                    targetArray.push({ questionId, userAnswer: answer, isCorrect: false });
                }
                
                if (timeSpent) attempt.timeSpent = timeSpent;
                await attempt.save();
                return ok(res, null, 'Đã lưu đáp án tạm thời');
            }
            return notFound(res, 'Không tìm thấy lượt làm bài thi trắc nghiệm');
        }

        return badRequest(res, 'Loại bài tập (type) không hợp lệ');
    } catch (error) {
        return serverError(res, 'Lỗi khi lưu đáp án: ' + error.message);
    }
};

const autoGradeExam = async (attempt) => {
    const exam = await Exam.findById(attempt.exam).populate('sections.listening').populate('sections.reading');
    if (!exam) return attempt;

    let listeningScore = 0;
    let readingScore = 0;

    // Gộp tất cả câu hỏi của listening
    const listeningQuestions = exam.sections.listening?.flatMap(item => item.questions) || [];
    attempt.listeningAnswers.forEach(ans => {
        const q = listeningQuestions.find(q => q._id.toString() === ans.questionId.toString());
        if (q) {
            let isCorrect = false;
            
            if (q.correctAnswer !== undefined) {
                isCorrect = (ans.userAnswer === q.correctAnswer);
            } else if (q.answers && Array.isArray(q.answers)) {
                const correctOpt = q.answers.find(a => a.isCorrect);
                if (correctOpt && (ans.userAnswer === correctOpt.label || ans.userAnswer === correctOpt._id.toString())) {
                    isCorrect = true;
                }
            }

            if (isCorrect) {
                ans.isCorrect = true;
                ans.points = q.points || 5;
                listeningScore += ans.points;
            } else {
                ans.isCorrect = false;
                ans.points = 0;
            }
        }
    });

    // Gộp tất cả câu hỏi của reading
    const readingQuestions = exam.sections.reading?.flatMap(item => item.questions) || [];
    attempt.readingAnswers.forEach(ans => {
        const q = readingQuestions.find(q => q._id.toString() === ans.questionId.toString());
        if (q) {
            let isCorrect = false;
            
            if (q.correctAnswer !== undefined) {
                isCorrect = (ans.userAnswer === q.correctAnswer);
            } else if (q.answers && Array.isArray(q.answers)) {
                const correctOpt = q.answers.find(a => a.isCorrect);
                if (correctOpt && (ans.userAnswer === correctOpt.label || ans.userAnswer === correctOpt._id.toString())) {
                    isCorrect = true;
                }
            }

            if (isCorrect) {
                ans.isCorrect = true;
                ans.points = q.points || 5;
                readingScore += ans.points;
            } else {
                ans.isCorrect = false;
                ans.points = 0;
            }
        }
    });

    attempt.listeningScore = listeningScore;
    attempt.readingScore = readingScore;
    attempt.totalScore = listeningScore + readingScore;
    attempt.status = 'completed';
    attempt.completedAt = new Date();

    return attempt;
};

export const submitAttempt = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const userId = req.user._id;

        let attempt = await ExamResult.findOne({ _id: attemptId, user: userId });
        if (attempt) {
            if (attempt.status !== 'in_progress') return badRequest(res, 'Lượt làm bài này đã được nộp trước đó');
            
            attempt = await autoGradeExam(attempt);
            await attempt.save();
            return ok(res, attempt, 'Nộp bài và chấm điểm tự động thành công');
        }

        let wSubmission = await WritingSubmission.findOne({ _id: attemptId, user: userId }).populate('writing');
        if (wSubmission) {
            if (wSubmission.status !== 'draft') return badRequest(res, 'Bài viết này đã được nộp');
            
            // Lưu trạng thái đề phòng quá trình gọi AI bị timeout
            wSubmission.status = 'pending_ai'; 
            await wSubmission.save();

            try {
                // Gọi AI để chấm bài
                const aiResult = await evaluateWritingWithAI(
                    wSubmission.writing?.title || 'Chủ đề tự do',
                    wSubmission.writing?.description || '',
                    wSubmission.content
                );

                wSubmission.evaluation = {
                    totalScore: aiResult.score,
                    aiFeedback: aiResult.feedback,
                    detailedCorrection: aiResult.detailedCorrection
                };
                wSubmission.status = 'evaluated';
            } catch (err) {
                wSubmission.status = 'ai_failed';
                console.error('Lỗi khi AI chấm điểm bài viết:', err);
            }

            await wSubmission.save();
            return ok(res, wSubmission, 'Nộp bài viết và xử lý AI thành công');
        }

        return notFound(res, 'Không tìm thấy lượt làm bài');
    } catch (error) {
        return serverError(res, 'Lỗi khi nộp bài: ' + error.message);
    }
};

export const getAttemptResult = async (req, res) => {
    try {
        const { attemptId } = req.params;
        
        let attempt = await ExamResult.findById(attemptId).lean();
        if (attempt) {
            if (!hasAccess(req, attempt.user)) return badRequest(res, 'Không có quyền truy cập');
            return ok(res, attempt, 'Lấy kết quả tổng quan thành công');
        }

        let wSubmission = await WritingSubmission.findById(attemptId).lean();
        if (wSubmission) {
            if (!hasAccess(req, wSubmission.user)) return badRequest(res, 'Không có quyền truy cập');
            return ok(res, wSubmission, 'Lấy kết quả bài viết thành công');
        }

        return notFound(res, 'Không tìm thấy lượt làm bài');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy kết quả: ' + error.message);
    }
};

export const reviewAttempt = async (req, res) => {
    try {
        const { attemptId } = req.params;

        let attempt = await ExamResult.findById(attemptId)
            .populate({
                path: 'exam',
                populate: [
                    { path: 'sections.listening' },
                    { path: 'sections.reading' }
                ]
            }).lean();
            
        if (attempt) {
            if (!hasAccess(req, attempt.user)) return badRequest(res, 'Không có quyền truy cập');
            return ok(res, attempt, 'Lấy chi tiết bài review thành công');
        }

        let wSubmission = await WritingSubmission.findById(attemptId).populate('writing').lean();
        if (wSubmission) {
            if (!hasAccess(req, wSubmission.user)) return badRequest(res, 'Không có quyền truy cập');
            return ok(res, wSubmission, 'Lấy chi tiết bài viết review thành công');
        }

        return notFound(res, 'Không tìm thấy lượt làm bài');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy review chi tiết: ' + error.message);
    }
};