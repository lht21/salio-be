import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2: cloudinary } from 'cloudinary';
import { badRequest } from '../utils/response.js';

// ─── Cloudinary config ────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Cloudinary Storage Engine ────────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'salio/avatars',
    public_id:      `avatar_${req.user._id}`,   // 1 user = 1 file, tự ghi đè
    overwrite:      true,
    resource_type:  'image',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // crop vuông, ưu tiên mặt
      { quality: 'auto', fetch_format: 'auto' },                   // tự chọn WebP/AVIF
    ],
  }),
});

// ─── File filter ──────────────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP'), false);
  }
};

// ─── Multer instance ──────────────────────────────────────────────────────────
const maxSizeMB = parseInt(process.env.MAX_AVATAR_SIZE_MB, 10) || 5;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

// ─── Middleware: upload single avatar ─────────────────────────────────────────
const uploadAvatar = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return badRequest(res, `Ảnh không được vượt quá ${maxSizeMB}MB`);
      }
      return badRequest(res, `Lỗi upload: ${err.message}`);
    }
    if (err) return badRequest(res, err.message);
    if (!req.file) return badRequest(res, 'Vui lòng cung cấp file ảnh (field name: avatar)');
    next();
  });
};

// ─── Xoá ảnh cũ trên Cloudinary (gọi khi cần xoá thủ công) ──────────────────
// Vì public_id cố định theo userId, Cloudinary tự ghi đè nên thường không cần gọi hàm này.
// Dùng khi user xoá tài khoản.
const deleteAvatar = async (userId) => {
  try {
    await cloudinary.uploader.destroy(`salio/avatars/avatar_${userId}`);
  } catch (e) {
    console.warn('[Cloudinary] Could not delete avatar:', e.message);
  }
};

export { uploadAvatar, deleteAvatar };