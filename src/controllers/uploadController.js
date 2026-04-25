import { ok, badRequest, serverError } from '../utils/response.js';

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return badRequest(res, 'Vui lòng cung cấp file hợp lệ');
        }
        // req.file.location là URL công khai của file trên S3 do multer-s3 cung cấp
        return ok(res, { fileUrl: req.file.location }, 'Tải file lên thành công');
    } catch (err) {
        return serverError(res, 'Lỗi khi tải file lên: ' + err.message);
    }
};