import User from "../models/User.js"
import mongoose from "mongoose";
import multer from 'multer'
import path from 'path'

// controllers/userController.js - Sửa hàm getUserProfile
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if(user) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                fullName: user.fullName,
                level: user.level,
                topikAchievement: user.topikAchievement,
                subscription: user.subscription,
                progress: user.progress
            });
        } else {
            res.status(400).json({msg: 'Không tìm thấy người dùng'})
        }
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cấu hình multer cho upload avatar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/')
  },
  filename: function (req, file, cb) {
    // Tạo tên file unique: timestamp + random number + extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const extension = path.extname(file.originalname)
    cb(null, 'avatar-' + uniqueSuffix + extension)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    const allowedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedFormats.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)'), false)
    }
  }
})

const uploadAvatar = async (req, res) => {
  try {
    // Sử dụng multer middleware
    upload.single('avatar')(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ msg: err.message })
      }

      if (!req.file) {
        return res.status(400).json({ msg: 'Vui lòng chọn ảnh đại diện' })
      }

      // TẠO FULL URL GIỐNG NHƯ UPLOAD LISTENING
      const protocol = req.protocol // http hoặc https
      const host = req.get('host') // localhost:5000
      const fullAvatarUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`
      
      console.log('📸 [UploadAvatar] File uploaded:', req.file.filename)
      console.log('📸 [UploadAvatar] Full URL:', fullAvatarUrl)
      
      // Cập nhật avatar trong database
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: fullAvatarUrl },
        { new: true }
      ).select('-password')

      res.json({
        msg: 'Cập nhật ảnh đại diện thành công',
        avatar: fullAvatarUrl,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          fullName: user.fullName,
          level: user.level,
          topikAchievement: user.topikAchievement
        }
      })
    })
  } catch (error) {
    console.error('❌ [UploadAvatar] Error:', error)
    res.status(500).json({ msg: 'Lỗi server khi upload avatar', error: error.message })
  }
}

// Sửa hàm updateUserProfile - chỉ cập nhật các trường có trong model
const updateUserProfile = async (req, res) => {
    try {
        console.log('🔐 [UpdateProfile] req.user._id:', req.user._id);
        console.log('🔐 [UpdateProfile] req.body:', req.body);
        
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
        }

        // Chỉ cập nhật các trường có trong model
        user.username = req.body.username || user.username;
        user.fullName = req.body.fullName || user.fullName;
        user.email = req.body.email || user.email;
        user.level = req.body.level || user.level;
        user.topikAchievement = req.body.topikAchievement || user.topikAchievement;

        await user.save();

        // Trả về thông tin user đã cập nhật
        const updatedUser = {
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            fullName: user.fullName,
            level: user.level,
            topikAchievement: user.topikAchievement,
            subscription: user.subscription,
            progress: user.progress
        };

        res.json(updatedUser);
    } catch (error) {
        console.error('❌ [UpdateProfile] Error:', error);
        res.status(400).json({ msg: error.message });
    }
};

// Các hàm khác giữ nguyên...
const getAllUsers = async (req, res) => {
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;

    const filter = {}
    if (req.query.role) {
        filter.role = req.query.role
    }

    if(req.query.search) {
        filter.$or = [
            { username: { $regex: req.query.search, $options: 'i'}},
            { fullName: { $regex: req.query.search, $options: 'i'}},
            { email: { $regex: req.query.search, $options: 'i'} }
        ]
    }

    try {
        const count = await User.countDocuments(filter);

        const users = await User.find(filter)
            .select('-password')
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            users,
            page,
            pages: Math.ceil(count / pageSize),
            total: count
        })
        
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server khi lấy danh sách người dùng.' })
        
    }
}

const getUserById = async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'ID người dùng không hợp lệ!'})
    }

    try {
        const user = await User.findById(req.params.id).select('-password')

        if(user) {
            res.json(user);
        } else {
            res.status(400).json({msg: "Không tìm thấy người dùng"})
        }
        
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server'})
    }
}

const createUser = async (req, res) => {
    const { username, fullName, email, password, role, level } = req.body;

    if (!username || !fullName || !email || !password || !role) {
        return res.status(400).json({ msg: 'Vui lòng cung cấp đầy đủ thông tin'})
    }

    try {
        const userExists = await User.findOne({email});
        if(userExists) {
            return res.status(400).json({msg: 'Email đã tồn tại'})
        }

        const user = new User({
            username,
            fullName,
            email,
            password,
            role,
            level,
            isEmailVerified: true
        })

        await user.save();

        const userRespone = user.toObject();
        delete userRespone.password;

        res.status(201).json(userRespone);

        
    } catch (error) {
        res.status(500).json({msg: "Lỗi server khi tạo người dùng", error: error.message});
        
    }
}

const updateUser = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'ID người dùng không hợp lệ.' });
    }
    
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ msg: 'Không tìm thấy người dùng.' });
        }

        // Kiểm tra quyền: Teacher chỉ được update chính mình
        if (req.user.role === 'teacher' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ 
                msg: 'Giáo viên chỉ có thể cập nhật thông tin của chính mình' 
            });
        }

        // Kiểm tra quyền: Không cho phép thay đổi role nếu không phải admin
        if (req.body.role && req.body.role !== user.role && req.user.role !== 'admin') {
            return res.status(403).json({ 
                msg: 'Chỉ admin mới có quyền thay đổi vai trò' 
            });
        }

        // Cập nhật thông tin cơ bản
        user.username = req.body.username || user.username;
        user.fullName = req.body.fullName || user.fullName;
        user.email = req.body.email || user.email;
        
        // Chỉ admin mới được thay đổi role
        if (req.body.role && req.user.role === 'admin') {
            user.role = req.body.role;
        }
        
        user.level = req.body.level || user.level;
        user.avatar = req.body.avatar || user.avatar;
        user.topikAchievement = req.body.topikAchievement || user.topikAchievement;

        // Xử lý đổi mật khẩu nếu có
        if (req.body.password) {
             const userWithPassword = await User.findById(req.params.id).select('+password');
             userWithPassword.password = req.body.password;
             await userWithPassword.save();
        } else {
            await user.save();
        }

        // Trả về user mới nhất
        const updatedUser = await User.findById(req.params.id).select('-password');
        res.json(updatedUser); 
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server khi cập nhật người dùng.', error: error.message });
    }
};

const deleteUser = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'ID người dùng không hợp lệ.' });
    }

    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ msg: 'Không tìm thấy người dùng.' });
        }
        
        // Bảo vệ: Không cho admin tự xóa chính mình
        if (user._id.equals(req.user._id)) {
            return res.status(400).json({ msg: 'Bạn không thể tự xóa tài khoản admin của mình.' });
        }

        await User.findByIdAndDelete(req.params.id);
        
        res.json({ msg: 'Người dùng đã được xóa thành công.' });
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server khi xóa người dùng.' });
    }
};

export {
    getUserProfile, 
    getAllUsers, 
    getUserById, 
    createUser, 
    updateUser, 
    deleteUser,
    updateUserProfile,
    uploadAvatar
}