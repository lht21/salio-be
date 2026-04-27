import Exam from '../models/Exam.js';
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js';

/**
 * GET /api/v1/exams
 * Lấy danh sách tất cả các vỏ đề thi đã tạo (Hỗ trợ phân trang, tìm kiếm)
 */
export const getAllExams = async (req, res) => {
    try {
        const { examType, isActive, search, page = 1, limit = 10 } = req.query;
        const query = {};

        if (examType) query.examType = examType;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const skip = (Number(page) - 1) * Number(limit);
        
        const exams = await Exam.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('createdBy', 'username email');

        const total = await Exam.countDocuments(query);

        return ok(res, {
            exams,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }, 'Lấy danh sách đề thi thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy danh sách đề thi: ' + error.message);
    }
};

/**
 * POST /api/v1/exams
 * Tạo vỏ Exam mới (title, examType, duration). Mảng sections khởi tạo rỗng
 */
export const createExam = async (req, res) => {
    try {
        const { title, examType, duration, totalScore, isPremium } = req.body;

        if (!title || !examType) {
            return badRequest(res, 'Thiếu thông tin bắt buộc (title, examType)');
        }

        const newExam = await Exam.create({
            title,
            examType,
            duration,
            totalScore,
            isPremium,
            createdBy: req.user ? req.user._id : undefined
        });

        return created(res, newExam, 'Tạo đề thi mới thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi tạo đề thi: ' + error.message);
    }
};

/**
 * GET /api/v1/exams/:examId
 * Lấy chi tiết đề thi, dùng .populate() để preview toàn bộ câu hỏi
 */
export const getExamById = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.examId)
            .populate('sections.listening')
            .populate('sections.reading')
            .populate('sections.writing')
            .populate('createdBy', 'username');

        if (!exam) {
            return notFound(res, 'Không tìm thấy đề thi');
        }

        return ok(res, exam, 'Lấy chi tiết đề thi thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi lấy chi tiết đề thi: ' + error.message);
    }
};

/**
 * PATCH /api/v1/exams/:examId
 * Cập nhật thông tin vỏ Exam (tên, thời gian)
 */
export const updateExam = async (req, res) => {
    try {
        // Loại bỏ trường 'sections' ra khỏi payload update 
        // để tránh Admin lỡ tay ghi đè làm mất mảng ID câu hỏi đã lắp ráp
        const { sections, ...updateData } = req.body;

        const exam = await Exam.findByIdAndUpdate(
            req.params.examId,
            updateData,
            { returnDocument: 'after', runValidators: true }
        );

        if (!exam) return notFound(res, 'Không tìm thấy đề thi để cập nhật');

        return ok(res, exam, 'Cập nhật thông tin đề thi thành công');
    } catch (error) {
        return serverError(res, 'Lỗi khi cập nhật đề thi: ' + error.message);
    }
};

/**
 * PATCH /api/v1/exams/:examId/publish
 * Toggle isActive. Có thể validate logic nghiệp vụ trước khi publish
 */
export const togglePublishExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.examId);
        if (!exam) return notFound(res, 'Không tìm thấy đề thi');

        const newStatus = !exam.isActive;

        // Logic Validate: Nếu bật Xuất bản (Publish), kiểm tra xem đề đã có câu hỏi chưa
        if (newStatus === true) {
            const totalItems = exam.sections.listening.length + exam.sections.reading.length + exam.sections.writing.length;
            if (totalItems === 0) {
                return badRequest(res, 'Không thể xuất bản! Đề thi này đang trống, vui lòng lắp ráp câu hỏi trước.');
            }
        }

        exam.isActive = newStatus;
        await exam.save();

        const message = newStatus ? 'Đã xuất bản đề thi hiển thị cho Học viên' : 'Đã ẩn đề thi thành công';
        return ok(res, exam, message);
    } catch (error) {
        return serverError(res, 'Lỗi khi thay đổi trạng thái đề thi: ' + error.message);
    }
};

/**
 * DELETE /api/v1/exams/:examId
 * Xóa vỏ Exam (không xóa câu hỏi gốc trong Ngân hàng)
 */
export const deleteExam = async (req, res) => {
    try {
        const exam = await Exam.findByIdAndDelete(req.params.examId);
        if (!exam) return notFound(res, 'Không tìm thấy đề thi để xóa');

        // Lưu ý: Chỉ xóa document vỏ đề thi, dữ liệu Reading/Listening trong Bank vẫn an toàn
        return ok(res, null, 'Đã xóa vỏ đề thi thành công. Dữ liệu câu hỏi gốc trong kho vẫn được giữ lại.');
    } catch (error) {
        return serverError(res, 'Lỗi khi xóa đề thi: ' + error.message);
    }
};

/**
 * PATCH /api/v1/exams/:examId/assemble
 * Lắp ráp: nhận mảng itemIds từ Client và lưu vào sections[type]
 */
export const assembleExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const { sectionType, itemIds } = req.body; // sectionType: 'listening' | 'reading' | 'writing'

        // Kiểm tra input hợp lệ
        if (!['listening', 'reading', 'writing'].includes(sectionType)) {
            return badRequest(res, 'Loại kỹ năng (sectionType) không hợp lệ. Chỉ chấp nhận: listening, reading, writing');
        }
        if (!Array.isArray(itemIds)) {
            return badRequest(res, 'Trường itemIds phải là một mảng các ID');
        }

        const exam = await Exam.findById(examId);
        if (!exam) return notFound(res, 'Không tìm thấy đề thi');

        // Lắp ráp: Ghi đè mảng ID mới vào đúng section tương ứng
        exam.sections[sectionType] = itemIds;
        await exam.save();

        // Lấy lại dữ liệu và populate luôn section vừa thêm để trả về preview
        const updatedExam = await Exam.findById(examId).populate(`sections.${sectionType}`);

        return ok(res, updatedExam, `Đã lắp ráp thành công danh sách câu hỏi phần ${sectionType}`);
    } catch (error) {
        return serverError(res, 'Lỗi khi lắp ráp đề thi: ' + error.message);
    }
};