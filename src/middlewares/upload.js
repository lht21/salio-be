import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Khởi tạo S3 client với credentials từ .env
export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Hàm kiểm tra loại file có phải là ảnh không
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Lỗi: Chỉ cho phép tải lên file ảnh! (jpeg, jpg, png, gif, webp)'));
};

// Cấu hình Multer để upload lên S3
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE, // Tự động set content-type
    key: (req, file, cb) => {
      // Tạo tên file duy nhất: avatars/userId-timestamp.ext
      const fileName = `avatars/${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 5 }, // Giới hạn kích thước file 5MB
  fileFilter: fileFilter,
});

export default upload;