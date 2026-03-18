import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import { SupportTicket, User } from '../models/index.js';

dotenv.config();

const NUM_TICKETS = 50;

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected...');
    } catch (err) {
        console.error('❌ Connection Error:', err);
        process.exit(1);
    }
};

const seedSupportTicket = async () => {
    await connectDB();

    try {
        console.log('--- 🧹 Đang dọn dẹp dữ liệu Support Ticket cũ... ---');
        await SupportTicket.deleteMany({});

        // 1. Phân loại User
        const allUsers = await User.find({});
        if (allUsers.length === 0) {
            console.error('⚠️ Cần chạy seedUserData.js trước để có User.');
            process.exit(1);
        }

        // Tách user thường và staff (admin/teacher)
        const students = allUsers.filter(u => u.role === 'student');
        const staffMembers = allUsers.filter(u => ['admin', 'teacher'].includes(u.role));

        // Nếu không có staff, lấy tạm user bất kỳ làm staff để script chạy được
        const supportStaff = staffMembers.length > 0 ? staffMembers : [allUsers[0]];
        const requesters = students.length > 0 ? students : allUsers;

        console.log('--- 🚀 Bắt đầu tạo dữ liệu Ticket giả ---');

        const tickets = [];
        const categories = ['account', 'payment', 'technical', 'content', 'other'];
        const statuses = ['open', 'pending_user', 'in_progress', 'resolved', 'closed'];

        for (let i = 0; i < NUM_TICKETS; i++) {
            const requester = faker.helpers.arrayElement(requesters);
            const assignee = faker.datatype.boolean(0.8) ? faker.helpers.arrayElement(supportStaff) : null; // 20% chưa có người nhận
            
            const category = faker.helpers.arrayElement(categories);
            let status = faker.helpers.arrayElement(statuses);

            // Logic: Nếu chưa có assignee thì status phải là open
            if (!assignee) {
                status = 'open';
            }

            const createdAt = faker.date.past({ years: 0.5 });
            
            // Tạo hội thoại giả
            const messages = [];
            
            // Message 1: User hỏi (Luôn có)
            messages.push({
                sender: requester._id,
                message: faker.lorem.paragraph(),
                isInternal: false,
                createdAt: createdAt
            });

            // Nếu đã có người nhận, thêm các message trả lời
            if (assignee) {
                // Staff trả lời
                const replyTime = new Date(createdAt.getTime() + 60 * 60 * 1000); // +1 tiếng
                messages.push({
                    sender: assignee._id,
                    message: faker.lorem.paragraph(),
                    isInternal: false,
                    createdAt: replyTime
                });

                // 50% User trả lời lại
                if (faker.datatype.boolean()) {
                    const replyTime2 = new Date(replyTime.getTime() + 2 * 60 * 60 * 1000);
                    messages.push({
                        sender: requester._id,
                        message: "Cảm ơn, tôi đã hiểu.",
                        isInternal: false,
                        createdAt: replyTime2
                    });
                }

                // 30% Có ghi chú nội bộ của staff
                if (faker.datatype.boolean(0.3)) {
                    messages.push({
                        sender: assignee._id,
                        message: `Note: User này gặp vấn đề về ${category}, cần check kỹ log.`,
                        isInternal: true, // Chỉ admin thấy
                        createdAt: new Date(replyTime.getTime() + 5 * 60 * 1000)
                    });
                }
            }

            const ticket = {
                requester: requester._id,
                assignee: assignee ? assignee._id : null,
                subject: faker.company.catchPhrase(), // Tiêu đề ngẫu nhiên
                description: messages[0].message, // Lấy message đầu làm description
                category: category,
                status: status,
                priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
                messages: messages,
                createdAt: createdAt,
                updatedAt: faker.date.between({ from: createdAt, to: new Date() })
            };

            // Nếu đã giải quyết xong
            if (status === 'resolved' || status === 'closed') {
                ticket.resolvedAt = ticket.updatedAt;
                ticket.rating = faker.number.int({ min: 3, max: 5 });
            }

            tickets.push(ticket);
        }

        await SupportTicket.insertMany(tickets);
        console.log(`✅ Đã tạo thành công ${tickets.length} support tickets.`);
        
        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi Seeder Ticket:', error);
        process.exit(1);
    }
};

seedSupportTicket();