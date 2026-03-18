import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Culture, CultureCategory } from '../models/index.js';

// Lấy danh sách categories
export const getCategories = async (req, res) => {
    try {
        const categories = await CultureCategory.find({ isActive: true })
            .sort({ sortOrder: 1, createdAt: 1 });
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách categories',
            error: error.message
        });
    }
};

// Lấy danh sách culture items cho học viên (chỉ approved)
export const getCultureItems = async (req, res) => {
    try {
        const { categoryId, page = 1, limit = 10, search } = req.query;
        
        let query = { 
            status: 'approved', 
            isPublished: true 
        };
        
        if (categoryId && categoryId !== 'all') {
            query['category.id'] = categoryId;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const items = await Culture.find(query)
            .populate('author', 'fullName email')
            .sort({ publishedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Culture.countDocuments(query);
        
        res.json({
            success: true,
            data: {
                items,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    hasNextPage: page * limit < total,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách culture items',
            error: error.message
        });
    }
};

// Lấy chi tiết một culture item
export const getCultureItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        const item = await Culture.findById(id)
            .populate('author', 'fullName email')
            .populate('approvedBy', 'fullName');
            
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nội dung văn hóa'
            });
        }
        
        // Chỉ cho phép xem nếu đã được approve hoặc là tác giả
        if (item.status !== 'approved' && (!req.user || item.author._id.toString() !== req.user._id.toString())) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem nội dung này'
            });
        }
        
        // Tăng view count nếu đã approved
        if (item.status === 'approved') {
            await Culture.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
        }
        
        res.json({
            success: true,
            data: item
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết culture item',
            error: error.message
        });
    }
};

// Tạo culture item mới (cho teacher)
export const createCultureItem = async (req, res) => {
    try {
        const {
            title,
            content,
            summary,
            subtitle,
            description,
            coverImage,
            images,
            videoUrl,
            category,
            tags,
            difficulty
        } = req.body;
        
        // Kiểm tra quyền teacher
        if (!req.user || req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ giáo viên mới có thể tạo nội dung văn hóa'
            });
        }
        
        const newItem = new Culture({
            title,
            content,
            summary,
            subtitle,
            description,
            author: req.user._id,
            coverImage,
            images,
            videoUrl,
            category,
            tags,
            difficulty,
            status: 'draft'
        });
        
        await newItem.save();
        await newItem.populate('author', 'fullName email');
        
        res.status(201).json({
            success: true,
            message: 'Tạo nội dung văn hóa thành công',
            data: newItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo culture item',
            error: error.message
        });
    }
};

// Cập nhật culture item (cho teacher - chỉ của mình)
export const updateCultureItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const item = await Culture.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nội dung văn hóa'
            });
        }
        
        // Kiểm tra quyền
        if (!req.user || (item.author.toString() !== req.user._id.toString() && req.user.role !== 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền chỉnh sửa nội dung này'
            });
        }
        
        // Không cho phép sửa nếu đã được approve (trừ admin)
        if (item.status === 'approved' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Không thể chỉnh sửa nội dung đã được duyệt'
            });
        }
        
        // Reset status về draft nếu teacher sửa
        if (req.user.role === 'teacher' && ['pending', 'rejected'].includes(item.status)) {
            updateData.status = 'draft';
            updateData.rejectionReason = undefined;
        }
        
        const updatedItem = await Culture.findByIdAndUpdate(id, updateData, { new: true })
            .populate('author', 'fullName email');
            
        res.json({
            success: true,
            message: 'Cập nhật nội dung thành công',
            data: updatedItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật culture item',
            error: error.message
        });
    }
};

// Gửi để duyệt (teacher)
export const submitForApproval = async (req, res) => {
    try {
        const { id } = req.params;
        
        const item = await Culture.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nội dung văn hóa'
            });
        }
        
        // Kiểm tra quyền
        if (!req.user || item.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này'
            });
        }
        
        // Chỉ cho phép submit nếu đang ở trạng thái draft hoặc rejected
        if (!['draft', 'rejected'].includes(item.status)) {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể gửi duyệt nội dung ở trạng thái nháp hoặc đã bị từ chối'
            });
        }
        
        await Culture.findByIdAndUpdate(id, {
            status: 'pending',
            rejectionReason: undefined
        });
        
        res.json({
            success: true,
            message: 'Gửi nội dung để duyệt thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi gửi nội dung để duyệt',
            error: error.message
        });
    }
};

// Lấy danh sách culture items cho admin
export const getCultureItemsForAdmin = async (req, res) => {
    try {
        const { status, page = 1, limit = 10, search } = req.query;
        
        // Kiểm tra quyền admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ admin mới có thể truy cập'
            });
        }
        
        let query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const items = await Culture.find(query)
            .populate('author', 'fullName email')
            .populate('approvedBy', 'fullName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Culture.countDocuments(query);
        
        // Thống kê theo status
        const stats = await Culture.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        res.json({
            success: true,
            data: {
                items,
                stats: stats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {}),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    hasNextPage: page * limit < total,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách cho admin',
            error: error.message
        });
    }
};

// Duyệt culture item (admin)
export const approveCultureItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra quyền admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ admin mới có thể duyệt nội dung'
            });
        }
        
        const item = await Culture.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nội dung văn hóa'
            });
        }
        
        if (item.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể duyệt nội dung đang chờ duyệt'
            });
        }
        
        await Culture.findByIdAndUpdate(id, {
            status: 'approved',
            isPublished: true,
            approvedBy: req.user._id,
            approvedAt: new Date(),
            publishedAt: new Date(),
            rejectionReason: undefined
        });
        
        res.json({
            success: true,
            message: 'Duyệt nội dung thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi duyệt nội dung',
            error: error.message
        });
    }
};

// Từ chối culture item (admin)
export const rejectCultureItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        
        // Kiểm tra quyền admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ admin mới có thể từ chối nội dung'
            });
        }
        
        const item = await Culture.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nội dung văn hóa'
            });
        }
        
        if (item.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể từ chối nội dung đang chờ duyệt'
            });
        }
        
        if (!rejectionReason) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập lý do từ chối'
            });
        }
        
        await Culture.findByIdAndUpdate(id, {
            status: 'rejected',
            rejectionReason,
            isPublished: false
        });
        
        res.json({
            success: true,
            message: 'Từ chối nội dung thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi từ chối nội dung',
            error: error.message
        });
    }
};

// Lấy danh sách culture items của teacher
export const getMyCultureItems = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        
        // Kiểm tra quyền teacher
        if (!req.user || req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ giáo viên mới có thể truy cập'
            });
        }
        
        let query = { author: req.user._id };
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const skip = (page - 1) * limit;
        
        const items = await Culture.find(query)
            .populate('approvedBy', 'fullName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Culture.countDocuments(query);
        
        // Thống kê của teacher
        const stats = await Culture.aggregate([
            { $match: { author: req.user._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        res.json({
            success: true,
            data: {
                items,
                stats: stats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {}),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    hasNextPage: page * limit < total,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách nội dung của tôi',
            error: error.message
        });
    }
};

// Xóa culture item (teacher - chỉ draft, admin - tất cả)
export const deleteCultureItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        const item = await Culture.findById(id);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nội dung văn hóa'
            });
        }
        
        // Kiểm tra quyền
        const isOwner = req.user && item.author.toString() === req.user._id.toString();
        const isAdmin = req.user && req.user.role === 'admin';
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa nội dung này'
            });
        }
        
        // Teacher chỉ có thể xóa draft
        if (isOwner && req.user.role === 'teacher' && item.status !== 'draft') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ có thể xóa nội dung ở trạng thái nháp'
            });
        }
        
        await Culture.findByIdAndDelete(id);
        
        res.json({
            success: true,
            message: 'Xóa nội dung thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa nội dung',
            error: error.message
        });
    }
};


// 1. Cấu hình Multer cho Culture (Lưu vào uploads/cultures)
// Kiểm tra và tạo thư mục nếu chưa có
const uploadDir = 'uploads/cultures';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/cultures/') // Lưu vào folder cultures
  },
  filename: function (req, file, cb) {
    // Đặt tên file: culture-timestamp.jpg
    cb(null, `culture-${Date.now()}${path.extname(file.originalname)}`)
  }
});

// Filter chỉ cho phép ảnh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ được phép upload file ảnh!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});

// 2. Controller Upload Image (Sửa theo mẫu bạn yêu cầu)
export const uploadCultureImage = async (req, res) => {
  try {
    // Gọi multer trực tiếp trong controller (giống mẫu uploadAvatar)
    upload.single('image')(req, res, function (err) {
      // Xử lý lỗi từ Multer
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ msg: 'Lỗi Multer: ' + err.message });
      } else if (err) {
        return res.status(400).json({ msg: err.message });
      }

      // Kiểm tra xem có file không
      if (!req.file) {
        return res.status(400).json({ msg: 'Vui lòng chọn ảnh để upload' });
      }

      // TẠO FULL URL (Giống mẫu uploadAvatar)
      const protocol = req.protocol;
      const host = req.get('host');
      // Lưu ý: Đảm bảo server đã express.static('uploads')
      const fullImageUrl = `${protocol}://${host}/uploads/cultures/${req.file.filename}`;
      
      console.log('📸 [UploadCulture] File uploaded:', req.file.filename);
      console.log('📸 [UploadCulture] Full URL:', fullImageUrl);
      
      // Trả về URL để Frontend hiển thị và lưu vào form
      // Khác với avatar (update DB ngay), ở đây ta trả về link để user bấm "Lưu" sau
      res.json({
        msg: 'Upload ảnh thành công',
        imageUrl: fullImageUrl,
        filename: req.file.filename
      });
    });

  } catch (error) {
    console.error('❌ [UploadCulture] Error:', error);
    res.status(500).json({ msg: 'Lỗi server khi upload ảnh', error: error.message });
  }
};


// Lấy tất cả bài văn hóa
export const getCultures = async (req, res) => {
  try {
    const { category, includeDrafts } = req.query; // Thêm includeDrafts
    
    let filter = {};

    // Nếu KHÔNG có param includeDrafts=true thì chỉ lấy bài đã publish (cho user thường)
    if (includeDrafts !== 'true') {
        filter.isPublished = true;
    }
    // Ngược lại nếu có includeDrafts=true (từ trang admin gửi lên) thì bỏ qua filter isPublished -> lấy hết

    if (category && category !== 'Tất cả') {
      filter.category = category;
    }

    const cultures = await Culture.find(filter)
      .populate('author', 'username fullName avatar')
      .sort({ createdAt: -1 });

    res.json(cultures);
  } catch (error) {
    console.error('❌ [getCultures] Error:', error);
    res.status(500).json({ msg: 'Lỗi server', error: error.message });
  }
};

// Lấy chi tiết bài văn hóa
export const getCultureById = async (req, res) => {
  try {
    const culture = await Culture.findById(req.params.id)
      .populate('author', 'username fullName avatar');

    if (!culture) {
      return res.status(404).json({ msg: 'Không tìm thấy bài văn hóa' });
    }

    // Tăng lượt xem
    culture.views += 1;
    await culture.save();

    res.json(culture);
  } catch (error) {
    console.error('❌ [getCultureById] Error:', error);
    res.status(500).json({ msg: 'Lỗi server', error: error.message });
  }
};

// Tạo bài văn hóa mới
export const createCulture = async (req, res) => {
  try {
    console.log('📝 [createCulture] Request body:', req.body);
    console.log('📝 [createCulture] User ID:', req.userId);

    const cultureData = {
      ...req.body,
      author: req.userId // Sử dụng req.userId từ middleware
    };

    // Parse content và vocabulary nếu là string
    if (typeof cultureData.content === 'string') {
      try {
        cultureData.content = JSON.parse(cultureData.content);
      } catch (e) {
        console.error('❌ [createCulture] Parse content error:', e);
      }
    }

    if (typeof cultureData.vocabulary === 'string') {
      try {
        cultureData.vocabulary = JSON.parse(cultureData.vocabulary);
      } catch (e) {
        console.error('❌ [createCulture] Parse vocabulary error:', e);
      }
    }

    const culture = new Culture(cultureData);
    await culture.save();

    await culture.populate('author', 'username fullName avatar');

    // Log activity
    req.activityDescription = `Đã tạo bài văn hóa: ${culture.title}`;

    res.status(201).json({
      msg: 'Tạo bài văn hóa thành công',
      culture
    });
  } catch (error) {
    console.error('❌ [createCulture] Error:', error);
    res.status(500).json({ msg: 'Lỗi server', error: error.message });
  }
};

// Cập nhật bài văn hóa
export const updateCulture = async (req, res) => {
  try {
    const culture = await Culture.findById(req.params.id);

    if (!culture) {
      return res.status(404).json({ msg: 'Không tìm thấy bài văn hóa' });
    }

    // Kiểm tra quyền sở hữu
    if (culture.author.toString() !== req.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Không có quyền chỉnh sửa bài văn hóa này' });
    }

    const updateData = { ...req.body };

    // Parse content và vocabulary nếu là string
    if (typeof updateData.content === 'string') {
      try {
        updateData.content = JSON.parse(updateData.content);
      } catch (e) {
        console.error('❌ [updateCulture] Parse content error:', e);
      }
    }

    if (typeof updateData.vocabulary === 'string') {
      try {
        updateData.vocabulary = JSON.parse(updateData.vocabulary);
      } catch (e) {
        console.error('❌ [updateCulture] Parse vocabulary error:', e);
      }
    }

    const updatedCulture = await Culture.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'username fullName avatar');

    // Log activity
    req.activityDescription = `Đã cập nhật bài văn hóa: ${updatedCulture.title}`;

    res.json({
      msg: 'Cập nhật bài văn hóa thành công',
      culture: updatedCulture
    });
  } catch (error) {
    console.error('❌ [updateCulture] Error:', error);
    res.status(500).json({ msg: 'Lỗi server', error: error.message });
  }
};

// Xóa bài văn hóa
export const deleteCulture = async (req, res) => {
  try {
    const culture = await Culture.findById(req.params.id);

    if (!culture) {
      return res.status(404).json({ msg: 'Không tìm thấy bài văn hóa' });
    }

    // Kiểm tra quyền sở hữu
    if (culture.author.toString() !== req.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Không có quyền xóa bài văn hóa này' });
    }

    // Xóa ảnh nếu có
    if (culture.image && culture.image.includes('/uploads/cultures/')) {
      const filename = culture.image.split('/').pop();
      const imagePath = path.join('uploads/cultures', filename);
      
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Culture.findByIdAndDelete(req.params.id);

    // Log activity
    req.activityDescription = `Đã xóa bài văn hóa: ${culture.title}`;

    res.json({ msg: 'Xóa bài văn hóa thành công' });
  } catch (error) {
    console.error('❌ [deleteCulture] Error:', error);
    res.status(500).json({ msg: 'Lỗi server', error: error.message });
  }
};

// Toggle premium status
export const togglePremium = async (req, res) => {
  try {
    const culture = await Culture.findById(req.params.id);

    if (!culture) {
      return res.status(404).json({ msg: 'Không tìm thấy bài văn hóa' });
    }

    // Kiểm tra quyền
    if (culture.author.toString() !== req.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Không có quyền thay đổi trạng thái premium' });
    }

    culture.isPremium = !culture.isPremium;
    await culture.save();

    // Log activity
    req.activityDescription = `Đã ${culture.isPremium ? 'bật' : 'tắt'} premium cho bài văn hóa: ${culture.title}`;

    res.json({
      msg: `${culture.isPremium ? 'Đánh dấu' : 'Bỏ'} premium thành công`,
      culture
    });
  } catch (error) {
    console.error('❌ [togglePremium] Error:', error);
    res.status(500).json({ msg: 'Lỗi server', error: error.message });
  }
};