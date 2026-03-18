import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CultureCategory } from '../models/index.js';

dotenv.config();

const defaultCategories = [
    {
        id: 'all',
        title: 'Tất cả',
        description: 'Tất cả nội dung văn hóa Hàn Quốc',
        icon: '🌟',
        sortOrder: 0
    },
    {
        id: 'traditional',
        title: 'Truyền thống',
        description: 'Các truyền thống và phong tục cổ xưa của Hàn Quốc',
        icon: '🏮',
        sortOrder: 1
    },
    {
        id: 'food',
        title: 'Ẩm thực',
        description: 'Văn hóa ẩm thực đặc sắc của Hàn Quốc',
        icon: '🍜',
        sortOrder: 2
    },
    {
        id: 'festival',
        title: 'Lễ hội',
        description: 'Các lễ hội và sự kiện văn hóa quan trọng',
        icon: '🎊',
        sortOrder: 3
    },
    {
        id: 'pop-culture',
        title: 'Văn hóa đại chúng',
        description: 'K-pop, K-drama và văn hóa đại chúng hiện đại',
        icon: '🎭',
        sortOrder: 4
    },
    {
        id: 'social',
        title: 'Xã hội',
        description: 'Các chuẩn mực xã hội và cách ứng xử',
        icon: '👥',
        sortOrder: 5
    },
    {
        id: 'history',
        title: 'Lịch sử',
        description: 'Lịch sử và di sản văn hóa Hàn Quốc',
        icon: '📚',
        sortOrder: 6
    }
];

const seedCategories = async () => {
    try {
        // Kết nối đến MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Đã kết nối đến MongoDB');

        // Xóa tất cả categories cũ
        await CultureCategory.deleteMany({});
        console.log('🗑️ Đã xóa tất cả categories cũ');

        // Thêm categories mới
        await CultureCategory.insertMany(defaultCategories);
        console.log('✅ Đã thêm categories mặc định thành công');

        // Hiển thị danh sách categories
        const categories = await CultureCategory.find({}).sort({ sortOrder: 1 });
        console.log('\n📋 Danh sách categories:');
        categories.forEach(cat => {
            console.log(`${cat.icon} ${cat.title} (${cat.id}) - ${cat.description}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khi seed categories:', error);
        process.exit(1);
    }
};

// Chạy script
seedCategories();