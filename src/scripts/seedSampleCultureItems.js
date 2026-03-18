import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Culture, User } from '../models/index.js';

dotenv.config();

const sampleCultureItems = [
    {
        title: "Văn hóa Sunbae - Hoobae (선배-후배)",
        subtitle: "Mối quan hệ tiền bối - hậu bối",
        description: "Tìm hiểu về văn hóa phân cấp độ tuổi đặc trưng của Hàn Quốc, nơi mối quan hệ giữa người đi trước và đi sau được coi trọng.",
        content: `
Ở Hàn Quốc có một văn hóa rất đặc trưng gọi là sunbae-hoobae (선배-후배).

Sunbae có nghĩa là "tiền bối" - tức là những anh chị đi trước, có nhiều kinh nghiệm hơn. 
Hoobae là "hậu bối" - những người mới hơn, ít kinh nghiệm hơn hoặc tham gia muộn hơn.

Trong trường học hay câu lạc bộ, mối quan hệ này rất quan trọng.

Khi là hoobae - luôn phải chào hỏi là phép, cúi đầu là cách thể hiện sự tôn trọng đối với sunbae.

📖 Kinh nghiệm học tập:
Sunbae thường hướng dẫn hoobae trong học tập, hoạt động ngoại khóa, và là tấm gương để hoobae noi theo.
        `,
        category: {
            id: 'social',
            title: 'Xã hội',
            description: 'Các chuẩn mực xã hội và cách ứng xử'
        },
        tags: ['sunbae', 'hoobae', 'phân cấp', 'tôn trọng', 'trường học'],
        difficulty: 'beginner',
        status: 'approved',
        isPublished: true,
        publishedAt: new Date()
    },
    {
        title: "Lịch sử K-pop - Từ Underground đến Toàn cầu",
        subtitle: "Hành trình phát triển của âm nhạc Hàn",
        description: "Khám phá lịch sử phát triển của K-pop từ những ngày đầu với Seo Taiji and Boys đến hiện tượng toàn cầu BTS, BLACKPINK.",
        content: `
K-pop bắt đầu từ đầu những năm 1990 với nhóm nhạc Seo Taiji and Boys. 
Họ đã mang đến một làn gió mới cho ngành công nghiệp âm nhạc Hàn Quốc.

Timeline phát triển:
1992: Seo Taiji and Boys debut
1996: H.O.T. - Thần tượng Kpop đầu tiên  
2000s: TVXQ, Super Junior, Girls' Generation
2010s: BTS, BLACKPINK - Hiện tượng toàn cầu

K-pop không chỉ là âm nhạc mà còn là một nền công nghiệp giải trí hoàn chỉnh với hệ thống đào tạo nghiêm ngặt và marketing chuyên nghiệp.
        `,
        category: {
            id: 'pop-culture',
            title: 'Văn hóa đại chúng',
            description: 'K-pop, K-drama và văn hóa đại chúng hiện đại'
        },
        tags: ['k-pop', 'âm nhạc', 'idol', 'BTS', 'BLACKPINK', 'lịch sử'],
        difficulty: 'intermediate',
        status: 'approved',
        isPublished: true,
        publishedAt: new Date()
    },
    {
        title: "Banchan (반찬) - Văn hóa món ăn phụ",
        subtitle: "Những món ăn kèm không thể thiếu",
        description: "Tìm hiểu về banchan - những món ăn phụ được phục vụ miễn phí trong các bữa ăn Hàn Quốc, thể hiện lòng hiếu khách của người Hàn.",
        content: `
Banchan (반찬) là những món ăn phụ nhỏ có vai trò quan trọng trong ẩm thực Hàn Quốc!

🍽️ Banchan truyền thống bao gồm:
- 🥬 Kimchi (kim chi)  
- 🥒 Oi muchim (nộm dưa chuột)
- 🍄 Beoseot jorim (nấm om)  
- 🥕 Carrot namul (rau củ trộn)

Banchan thường được phục vụ miễn phí và có thể xin thêm!

💡 Mẹo hay:
Banchan không chỉ làm phong phú bữa ăn mà còn thể hiện sự chăm sóc và lòng hiếu khách của người nội trợ Hàn Quốc.
        `,
        category: {
            id: 'food',
            title: 'Ẩm thực',
            description: 'Văn hóa ẩm thực đặc sắc của Hàn Quốc'
        },
        tags: ['banchan', 'kimchi', 'ẩm thực', 'món phụ', 'miễn phí'],
        difficulty: 'beginner',
        status: 'approved',
        isPublished: true,
        publishedAt: new Date()
    },
    {
        title: "Tết Nguyên Đán Hàn Quốc (설날)",
        subtitle: "Lễ hội quan trọng nhất năm",
        description: "Khám phá truyền thống Tết Nguyên Đán của Hàn Quốc với những phong tục đặc biệt như chào đón tổ tiên, mặc hanbok và chơi các trò chơi truyền thống.",
        content: `
설날 (Seollal) - Tết Nguyên Đán là lễ hội quan trọng nhất trong năm của người Hàn Quốc.

🏮 Các hoạt động truyền thống:
- Mặc hanbok (한복) - trang phục truyền thống
- Chế bạo tổ tiên (차례) - nghi lễ thờ cúng  
- Sebae (세배) - lễ chào năm mới
- Ăn tteokguk (떡국) - súp bánh gạo

🎯 Trò chơi truyền thống:
- Yutnori (윷놀이) - trò chơi ném que
- Jegichagi (제기차기) - đá cầu
- Tuho (투호) - ném tên

Seollal là dịp để gia đình sum họp và thể hiện lòng hiếu thảo đối với ông bà, cha mẹ.
        `,
        category: {
            id: 'festival',
            title: 'Lễ hội',
            description: 'Các lễ hội và sự kiện văn hóa quan trọng'
        },
        tags: ['seollal', 'tết nguyên đán', 'hanbok', 'tteokguk', 'sebae'],
        difficulty: 'intermediate',
        status: 'approved',
        isPublished: true,
        publishedAt: new Date()
    }
];

const seedCultureItems = async () => {
    try {
        // Kết nối đến MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Đã kết nối đến MongoDB');

        // Tìm user đầu tiên để làm author (hoặc tạo một teacher user)
        let author = await User.findOne({ role: 'teacher' });
        if (!author) {
            // Tạo một teacher user mẫu
            author = new User({
                fullName: 'Giáo viên Kim',
                email: 'teacher@kwave.com', 
                password: 'hashedpassword',
                role: 'teacher'
            });
            await author.save();
            console.log('📝 Đã tạo teacher user mẫu');
        }

        // Xóa tất cả culture items cũ
        await Culture.deleteMany({});
        console.log('🗑️ Đã xóa tất cả culture items cũ');

        // Thêm author ID vào sample data
        const itemsWithAuthor = sampleCultureItems.map(item => ({
            ...item,
            author: author._id,
            approvedBy: author._id,
            approvedAt: new Date()
        }));

        // Thêm culture items mới
        const insertedItems = await Culture.insertMany(itemsWithAuthor);
        console.log('✅ Đã thêm culture items mẫu thành công');

        // Hiển thị danh sách items
        console.log('\n📋 Danh sách culture items:');
        insertedItems.forEach(item => {
            console.log(`📖 ${item.title} (${item.category.id}) - ${item.difficulty}`);
        });

        console.log(`\n📊 Tổng cộng: ${insertedItems.length} items`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khi seed culture items:', error);
        process.exit(1);
    }
};

// Chạy script
seedCultureItems();