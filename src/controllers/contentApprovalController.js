import Lesson from '../models/Lesson.js';
import Exam from '../models/Exam.js';     
import Culture from '../models/Culture.js'; 


import Vocabulary from '../models/Vocabulary.js';
import Grammar from '../models/Grammar.js';
import Listening from '../models/Listening.js';
import Speaking from '../models/Speaking.js';
import Reading from '../models/Reading.js';
import Writing from '../models/Writing.js';

// Helper để chọn model dựa trên type
const getModelByType = (type) => {
    switch (type) {
        case 'exam': return Exam;
        case 'culture': return Culture;
        case 'lesson': 
        default: return Lesson;
    }
};

const getContentList = async (req, res) => {
    try {
        const { status, pageNumber, type } = req.query; 
        const pageSize = 12; 
        const page = Number(pageNumber) || 1;
        
        const currentStatus = status || 'pending';
        const filter = { status: currentStatus };

        // Chọn Model dựa trên type gửi lên
        const Model = getModelByType(type);

        const count = await Model.countDocuments(filter);
        
        // Populate động: Exam và Culture cũng có author, nhưng field hiển thị có thể khác
        const items = await Model.find(filter)
            .populate('author', 'fullName email avatar') 
            .sort({ updatedAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        // Trả về thêm contentType để frontend dễ xử lý
        res.json({
            items,
            page,
            pages: Math.ceil(count / pageSize),
            total: count,
            status: currentStatus,
            type: type || 'lesson'
        });

    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server.', error: error.message });
    }
};

const approveOrRejectContent = async (req, res) => {
    try {
        const { decision, reason, type } = req.body; // Cần nhận thêm type từ body
        const { id } = req.params;

        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ msg: 'Quyết định không hợp lệ.' });
        }

        if (decision === 'rejected' && !reason) {
            return res.status(400).json({ msg: 'Vui lòng cung cấp lý do từ chối.' });
        }

        const Model = getModelByType(type);
        const content = await Model.findById(id);

        if (!content) {
            return res.status(404).json({ msg: 'Không tìm thấy nội dung.' });
        }

        // Cập nhật trạng thái
        content.status = decision;
        if (decision === 'approved') {
            content.approvedBy = req.user._id;
            content.approvedAt = Date.now();
            content.rejectionReason = undefined; 
            
            // Logic riêng cho từng loại nếu cần
            if (type === 'culture' || type === 'lesson') {
                content.isPublished = true;
            }
            if (type === 'exam') {
                content.isActive = true; // Exam dùng isActive thay vì isPublished (tuỳ schema)
            }

        } else {
            content.rejectionReason = reason;
            
            if (type === 'culture' || type === 'lesson') {
                content.isPublished = false;
            }
            if (type === 'exam') {
                content.isActive = false;
            }
        }

        await content.save();

        res.json({ msg: `Đã ${decision === 'approved' ? 'duyệt' : 'từ chối'} thành công.`, content });

    } catch (error) {
        console.error('❌ [approveOrRejectContent] Error:', error);
        res.status(500).json({ msg: 'Lỗi server.', error: error.message });
    }
};

const getContentDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query; // Nhận type từ query

        const Model = getModelByType(type);
        let query = Model.findById(id).populate('author', 'username email');

        // Populate đặc thù cho từng loại
        if (type === 'lesson') {
            query = query.populate('vocabulary grammar reading listening speaking writing');
        } 
        // Exam và Culture thường lưu dữ liệu dạng mảng object bên trong (embedded) nên không cần populate sâu như Lesson

        const content = await query;

        if (!content) return res.status(404).json({ msg: 'Không tìm thấy.' });
        
        // Trả về kèm type để frontend dễ render
        res.json({ ...content.toObject(), contentType: type || 'lesson' });

    } catch (error) {

        console.log('❌ [getContentDetail] Error:', error);
        
        res.status(500).json({ msg: 'Lỗi server.', error: error.message });
    }
};

export { getContentList, approveOrRejectContent, getContentDetail };