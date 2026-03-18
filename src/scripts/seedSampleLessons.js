import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Lesson, User } from '../models/index.js';

dotenv.config();

const sampleLessons = [
    {
        title: "한글 - 알파벳 한국어",
        level: "Sơ cấp 1",
        description: "Tiếng Hàn sơ cấp 1",
        order: 1,
        vocabulary: [], // Will be populated later
        grammar: [],
        listening: [],
        speaking: [],
        reading: [],
        writing: [],
        isPremium: false,
        estimatedDuration: 60,
        viewCount: 0,
        completionCount: 0,
        averageRating: 0,
        isPublished: true,
        isActive: true,
        status: 'approved'
    },
    {
        title: "기본 인사말 - Chào hỏi cơ bản",
        level: "Sơ cấp 1",
        description: "Học các cách chào hỏi cơ bản trong tiếng Hàn",
        order: 2,
        vocabulary: [],
        grammar: [],
        listening: [],
        speaking: [],
        reading: [],
        writing: [],
        isPremium: false,
        estimatedDuration: 45,
        viewCount: 0,
        completionCount: 0,
        averageRating: 0,
        isPublished: true,
        isActive: true,
        status: 'approved'
    },
    {
        title: "숫자와 시간 - Số đếm và thời gian",
        level: "Sơ cấp 1",
        description: "Học cách đọc số và nói về thời gian trong tiếng Hàn",
        order: 3,
        vocabulary: [],
        grammar: [],
        listening: [],
        speaking: [],
        reading: [],
        writing: [],
        isPremium: false,
        estimatedDuration: 50,
        viewCount: 0,
        completionCount: 0,
        averageRating: 0,
        isPublished: true,
        isActive: true,
        status: 'approved'
    },
    {
        title: "가족 - Gia đình",
        level: "Sơ cấp 1",
        description: "Từ vựng và cách nói về các thành viên trong gia đình",
        order: 4,
        vocabulary: [],
        grammar: [],
        listening: [],
        speaking: [],
        reading: [],
        writing: [],
        isPremium: false,
        estimatedDuration: 55,
        viewCount: 0,
        completionCount: 0,
        averageRating: 0,
        isPublished: true,
        isActive: true,
        status: 'approved'
    },
    {
        title: "음식과 식당 - Đồ ăn và nhà hàng",
        level: "Sơ cấp 2",
        description: "Học từ vựng về đồ ăn và cách gọi món trong nhà hàng",
        order: 5,
        vocabulary: [],
        grammar: [],
        listening: [],
        speaking: [],
        reading: [],
        writing: [],
        isPremium: true,
        estimatedDuration: 70,
        viewCount: 0,
        completionCount: 0,
        averageRating: 0,
        isPublished: true,
        isActive: true,
        status: 'approved'
    },
    {
        title: "교통과 방향 - Giao thông và chỉ đường",
        level: "Sơ cấp 2",
        description: "Học cách hỏi đường và sử dụng phương tiện giao thông",
        order: 6,
        vocabulary: [],
        grammar: [],
        listening: [],
        speaking: [],
        reading: [],
        writing: [],
        isPremium: true,
        estimatedDuration: 65,
        viewCount: 0,
        completionCount: 0,
        averageRating: 0,
        isPublished: true,
        isActive: true,
        status: 'approved'
    }
];

const seedLessons = async () => {
    try {
        // Kết nối đến MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Đã kết nối đến MongoDB');

        // Tìm user đầu tiên để làm author (hoặc tạo một teacher user)
        let author = await User.findOne({ role: 'teacher' });
        if (!author) {
            // Tạo một teacher user mẫu
            author = new User({
                fullName: 'Giáo viên Park',
                email: 'teacher.park@kwave.com', 
                password: 'hashedpassword',
                role: 'teacher'
            });
            await author.save();
            console.log('📝 Đã tạo teacher user mẫu');
        }

        // Xóa tất cả lesson cũ
        await Lesson.deleteMany({});
        console.log('🗑️ Đã xóa tất cả lessons cũ');

        // Thêm author ID vào sample data
        const lessonsWithAuthor = sampleLessons.map(lesson => ({
            ...lesson,
            author: author._id,
            approvedBy: author._id,
            approvedAt: new Date()
        }));

        // Thêm lessons mới
        const insertedLessons = await Lesson.insertMany(lessonsWithAuthor);
        console.log('✅ Đã thêm lessons mẫu thành công');

        // Hiển thị danh sách lessons
        console.log('\n📋 Danh sách lessons:');
        insertedLessons.forEach(lesson => {
            console.log(`📖 ${lesson.title} (${lesson.level}) - Order: ${lesson.order} - ${lesson.isPremium ? 'Premium' : 'Free'}`);
        });

        console.log(`\n📊 Tổng cộng: ${insertedLessons.length} lessons`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khi seed lessons:', error);
        process.exit(1);
    }
};

// Chạy script
seedLessons();