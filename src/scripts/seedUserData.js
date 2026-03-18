import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { 
    User, 
    Payment, 
    ExamResult, 
    Exam, 
    ExamSession 
} from '../models/index.js';

dotenv.config();

// Cấu hình số lượng
const NUM_USERS = 50;
const NUM_PAYMENTS = 100; // Ít hơn user để có người free người premium
const NUM_EXAM_SESSIONS = 200; 

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected...');
    } catch (err) {
        console.error('❌ Connection Error:', err);
        process.exit(1);
    }
};

const seedUserData = async () => {
    await connectDB();

    try {
        // console.log('--- 🧹 Đang dọn dẹp dữ liệu cũ... ---');
        // // Chỉ xóa user student, giữ lại admin/teacher nếu cần
        // await User.deleteMany({ role: 'student' }); 
        // await Payment.deleteMany({});
        // await ExamResult.deleteMany({});
        // await ExamSession.deleteMany({});

        console.log('--- 🚀 Bắt đầu tạo dữ liệu giả ---');

        // 1. Chuẩn bị Password Hash (Làm 1 lần dùng cho tất cả để nhanh)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        // 2. Tạo Users
        const users = [];
        const levels = ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'];

        for (let i = 0; i < NUM_USERS; i++) {
            const createdAt = faker.date.past({ years: 1 });
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            
            users.push({
                username: faker.person.fullName(),
                fullName: `${lastName} ${firstName}`,
                email: faker.internet.email({ firstName, lastName }),
                password: hashedPassword, // Dùng password đã hash
                role: 'student',
                level: faker.helpers.arrayElement(levels),
                avatar: faker.image.avatar(),
                isEmailVerified: true, // Cho phép login ngay
                topikAchievement: faker.number.int({ min: 1, max: 6 }),
                limits: {
                    dailyLessons: 3,
                    monthlyExams: 2
                },
                subscription: {
                    type: 'free',
                    isActive: false,
                    autoRenew: false
                },
                createdAt: createdAt,
                updatedAt: createdAt
            });
        }
        
        const createdUsers = await User.insertMany(users);
        const userIds = createdUsers.map(u => u._id);
        console.log(`✅ Đã tạo ${createdUsers.length} Users (Password mặc định: 123456).`);

        // 3. Tạo Payments & Cập nhật Premium cho User
        const payments = [];
        // Lấy ngẫu nhiên 40% user để mua gói premium
        const premiumUsersCount = Math.floor(NUM_USERS * 0.4);
        const premiumUserIndices = faker.helpers.shuffle([...Array(NUM_USERS).keys()]).slice(0, premiumUsersCount);

        for (const index of premiumUserIndices) {
            const user = createdUsers[index];
            const userId = user._id;
            
            // Random ngày mua trong 30 ngày qua
            const purchaseDate = faker.date.recent({ days: 30 });
            const expiryDate = new Date(purchaseDate);
            expiryDate.setDate(expiryDate.getDate() + 30); // Gói 1 tháng

            const isSuccess = faker.datatype.boolean(0.9); // 90% thành công

            // Tạo Payment
            payments.push({
                user: userId,
                amount: 199000,
                currency: 'VND',
                paymentMethod: faker.helpers.arrayElement(['momo', 'banking', 'credit_card']),
                transactionId: faker.string.uuid(),
                orderId: `ORD-${faker.string.alphanumeric(8).toUpperCase()}`, // Required field
                status: isSuccess ? 'completed' : 'failed',
                packageType: 'premium_monthly',
                packageName: 'Gói Premium 1 Tháng',
                startDate: purchaseDate,
                endDate: expiryDate,
                createdAt: purchaseDate,
                updatedAt: purchaseDate
            });

            // Nếu thanh toán thành công, update User Subscription
            if (isSuccess) {
                await User.findByIdAndUpdate(userId, {
                    subscription: {
                        type: 'premium_monthly',
                        startDate: purchaseDate,
                        endDate: expiryDate,
                        isActive: true,
                        autoRenew: true
                    },
                    'limits.canAccessPremiumContent': true,
                    'limits.canDownloadMaterials': true
                });
            }
        }

        await Payment.insertMany(payments);
        console.log(`✅ Đã tạo ${payments.length} Payments và cập nhật quyền Premium.`);

        // 4. Tạo Exam Results (Cần có Exam thật trong DB trước)
        // Lấy danh sách Exam thật
        const exams = await Exam.find({}, '_id title duration listening reading writing totalQuestions');
        
        if (exams.length > 0) {
            const examSessions = [];
            const examResults = [];

            for (let i = 0; i < NUM_EXAM_SESSIONS; i++) {
                const randomUser = faker.helpers.arrayElement(userIds);
                const randomExam = faker.helpers.arrayElement(exams);
                const startTime = faker.date.past({ years: 0.5 });
                const endTime = new Date(startTime.getTime() + (randomExam.duration * 60 * 1000));
                
                // Tạo điểm giả lập
                const score = faker.number.int({ min: 50, max: randomExam.totalQuestions * 10 }); // Giả định mỗi câu 10 điểm
                const maxScore = randomExam.totalQuestions * 10; // Hoặc lấy từ Exam config
                const percentage = (score / maxScore) * 100;
                
                // 4.1 Tạo ExamSession (Bắt buộc phải có Session thì mới có Result)
                const session = new ExamSession({
                    user: randomUser,
                    exam: randomExam._id,
                    status: 'completed',
                    timeLimit: randomExam.duration,
                    startedAt: startTime,
                    completedAt: endTime,
                    currentSection: 'writing',
                    currentQuestion: randomExam.totalQuestions
                });
                examSessions.push(session);

                // 4.2 Tạo ExamResult
                examResults.push({
                    user: randomUser,
                    exam: randomExam._id,
                    examSession: session._id, // Link tới session vừa tạo
                    totalScore: score,
                    maxScore: maxScore,
                    percentage: parseFloat(percentage.toFixed(1)),
                    passed: percentage >= 60,
                    timeSpent: randomExam.duration * 60, // giây
                    startedAt: startTime,
                    completedAt: endTime,
                    answers: [], // Để trống mảng chi tiết cho nhẹ DB khi seed
                    sectionResults: [
                        {
                            sectionName: 'Listening',
                            correctAnswers: 10,
                            totalQuestions: 20,
                            score: 50,
                            totalPoints: 100,
                            timeSpent: 1200,
                            accuracy: 50
                        }
                    ]
                });
            }

            // Lưu Session trước để có _id (mặc dù new Model() đã có _id nhưng save để đảm bảo)
            await ExamSession.insertMany(examSessions);
            await ExamResult.insertMany(examResults);
            
            // Cập nhật progress cho User
            console.log(`✅ Đã tạo ${examSessions.length} ExamSessions và ExamResults.`);
        } else {
            console.log('⚠️ Không tìm thấy Exam nào trong DB. Bỏ qua bước tạo kết quả thi.');
        }

        console.log('🎉 Seed dữ liệu User thành công!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi Seeder:', error);
        process.exit(1);
    }
};

seedUserData();