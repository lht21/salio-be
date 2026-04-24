import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';

// Lấy đường dẫn thư mục gốc để load file .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedAdmin = async () => {
  try {
    console.log('⏳ Đang kết nối tới MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('Chưa cấu hình MONGODB_URI trong file .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Kết nối MongoDB thành công!');

    // Lấy thông tin Admin từ biến môi trường, hoặc dùng giá trị mặc định nếu chưa cấu hình
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@salio.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminUsername = process.env.ADMIN_USERNAME || 'SuperAdmin';

    // 1. Kiểm tra Admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`⚠️ Tài khoản Admin với email [${adminEmail}] đã tồn tại trong hệ thống. Bỏ qua khởi tạo.`);
      process.exit(0);
    }

    // 2. Tạo tài khoản Super Admin
    const superAdmin = await User.create({
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      role: 'admin', // Gán quyền admin
      isEmailVerified: true,
      isActive: true,
    });

    console.log('🎉 Khởi tạo tài khoản Super Admin thành công!');
    console.log(`📧 Email đăng nhập: ${adminEmail}`);
    console.log(`🔑 Mật khẩu: ${adminPassword}`);
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo Super Admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedAdmin();