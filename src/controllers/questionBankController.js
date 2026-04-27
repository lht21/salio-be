import Reading from '../models/Reading.js';
import Listening from '../models/Listening.js';
import Writing from '../models/Writing.js';
import Speaking from '../models/Speaking.js';
import Exam from '../models/Exam.js';
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../middlewares/upload.js";

// Hàm tiện ích rẽ nhánh Model dựa trên tham số type
const getModelByType = (type) => {
    switch (type) {
        case 'reading': return Reading;
        case 'listening': return Listening;
        case 'writing': return Writing;
        case 'speaking': return Speaking;
        default: return null;
    }
};

/**
 * GET /api/v1/bank/:type
 * Lấy danh sách câu hỏi trong kho (hỗ trợ filter)
 */
export const getBankItems = async (req, res) => {
    try {
        const { type } = req.params;
        const { level, tags, difficulty, isActive } = req.query;
        
        const Model = getModelByType(type);
        if (!Model) {
            return res.status(400).json({ success: false, message: 'Loại kỹ năng không hợp lệ' });
        }

        // Xây dựng bộ lọc query
        const query = {};
        if (level) query.level = level;
        if (difficulty) query.difficulty = difficulty;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (tags) {
            // Hỗ trợ truyền mảng tags: ?tags=Giao tiếp,Bệnh viện
            const tagsArray = tags.split(',').map(tag => tag.trim());
            query.tags = { $in: tagsArray };
        }

        const items = await Model.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v1/bank/:type
 * Tạo một item mới vào kho
 */
export const createBankItem = async (req, res) => {
    try {
        const { type } = req.params;
        
        const Model = getModelByType(type);
        if (!Model) {
            return res.status(400).json({ success: false, message: 'Loại kỹ năng không hợp lệ' });
        }

        // Gắn ID người tạo (giả sử có middleware auth gắn user vào req)
        const itemData = {
            ...req.body,
            createdBy: req.user ? req.user._id : undefined
        };

        const newItem = await Model.create(itemData);

        res.status(201).json({
            success: true,
            data: newItem
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/v1/bank/:type/:itemId
 * Xem chi tiết toàn bộ nội dung của một item
 */
export const getBankItemById = async (req, res) => {
    try {
        const { type, itemId } = req.params;
        
        const Model = getModelByType(type);
        if (!Model) return res.status(400).json({ success: false, message: 'Loại kỹ năng không hợp lệ' });

        const item = await Model.findById(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu' });
        }

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /api/v1/bank/:type/:itemId
 * Cập nhật nội dung item
 */
export const updateBankItem = async (req, res) => {
    try {
        const { type, itemId } = req.params;
        
        const Model = getModelByType(type);
        if (!Model) return res.status(400).json({ success: false, message: 'Loại kỹ năng không hợp lệ' });

        // Lấy dữ liệu cũ để kiểm tra xem file có bị thay đổi không
        const oldItem = await Model.findById(itemId);
        if (!oldItem) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu để cập nhật' });
        }

        // Hàm tiện ích hỗ trợ xóa file S3
        const deleteS3File = async (fileUrl) => {
            if (!fileUrl) return;
            try {
                const parsedUrl = new URL(fileUrl);
                const key = decodeURIComponent(parsedUrl.pathname.substring(1));
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: key
                }));
            } catch (s3Err) {
                console.error('Lỗi khi xóa file cũ trên S3:', s3Err);
            }
        };

        // Nếu client gửi lên audioUrl mới (hoặc null) và khác với audioUrl cũ -> Xóa file cũ
        if (req.body.audioUrl !== undefined && req.body.audioUrl !== oldItem.audioUrl) {
            await deleteS3File(oldItem.audioUrl);
        }

        // Nếu client gửi lên attachedImage mới (hoặc null) và khác với ảnh cũ -> Xóa ảnh cũ
        if (req.body.attachedImage !== undefined && req.body.attachedImage !== oldItem.attachedImage) {
            await deleteS3File(oldItem.attachedImage);
        }

        const updatedItem = await Model.findByIdAndUpdate(itemId, req.body, {
            returnDocument: 'after',
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: updatedItem
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/v1/bank/:type/:itemId
 * Xóa item khỏi kho (Kèm theo logic check ràng buộc với Exam)
 */
export const deleteBankItem = async (req, res) => {
    try {
        const { type, itemId } = req.params;
        
        const Model = getModelByType(type);
        if (!Model) return res.status(400).json({ success: false, message: 'Loại kỹ năng không hợp lệ' });

        // Kiểm tra xem item này có đang được sử dụng trong bất kỳ đề thi (Exam) nào không
        // type khớp với trường trong Exam (listening, reading, writing)
        if (['reading', 'listening', 'writing'].includes(type)) {
            const queryKey = `sections.${type}`;
            const examUsingItem = await Exam.findOne({ [queryKey]: itemId });
            
            if (examUsingItem) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Không thể xóa! Dữ liệu này đang được sử dụng trong đề thi: ${examUsingItem.title}` 
                });
            }
        }

        const deletedItem = await Model.findByIdAndDelete(itemId);
        if (!deletedItem) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu để xóa' });
        }

        // --- DỌN DẸP FILE TRÊN S3 (NẾU CÓ) ---
        // Check xem document vừa xóa có chứa link audioUrl hoặc attachedImage không
        const fileUrl = deletedItem.audioUrl || deletedItem.attachedImage;
        if (fileUrl) {
            try {
                const parsedUrl = new URL(fileUrl);
                const key = decodeURIComponent(parsedUrl.pathname.substring(1)); // Lấy S3 Key từ URL
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: key
                }));
            } catch (s3Err) {
                console.error('Lỗi khi xóa file đính kèm trên S3:', s3Err);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Đã xóa thành công'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};