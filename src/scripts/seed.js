import mongoose from "mongoose";
import dotenv from "dotenv"
import User from "../models/User.js";
import News from "../models/News.js";

dotenv.config()

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected...');
        
    } catch (error) {
        console.error(error.message);
        process.exit(1)
        
    }
}

const sampleNewsData = [
    {
        title: "한국 전통 음식의 세계적 인기",
        subtitle: "김치, 불고기, 비빔밥 등 한국 음식이 전 세계인들의 사랑을 받고 있습니다",
        content: "한국 전통 음식이 전 세계적으로 큰 인기를 끌고 있습니다. 특히 김치는 건강식품으로 인정받으며 많은 나라에서 소비되고 있습니다. 불고기와 비빔밥도 한국 음식의 대표주자로 자리잡고 있어요. 한류 열풍과 함께 한국 음식에 대한 관심이 더욱 높아지고 있습니다.",
        summary: "한국 전통 음식의 세계적 확산과 인기 증가",
        source: "KBS",
        originalUrl: "https://news.kbs.co.kr/sample1",
        author: "김기자",
        category: "food",
        difficulty: "beginner",
        readingTime: 3,
        imageUrl: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=500",
        keywords: ["한국음식", "김치", "불고기", "한류"],
        tags: ["food", "culture", "beginner"],
        publishedDate: new Date('2024-12-01'),
        views: 1250,
        likes: 89,
        bookmarks: 34,
        status: "active",
        isApproved: true
    },
    {
        title: "K-팝의 글로벌 성공 스토리",
        subtitle: "방탄소년단부터 블랙핑크까지, K-팝이 세계 음악 시장을 석권하고 있습니다",
        content: "K-팝은 이제 단순한 음악 장르를 넘어서 전 세계적인 문화 현상이 되었습니다. 방탄소년단의 빌보드 차트 1위부터 시작된 K-팝의 성공은 블랙핑크, 스트레이 키즈, 아이브 등 다양한 아티스트들로 이어지고 있습니다. 이들의 성공 비결은 뛰어난 음악성과 퍼포먼스, 그리고 팬들과의 소통에 있습니다.",
        summary: "K-팝 아티스트들의 글로벌 음악 시장 성공",
        source: "SBS",
        originalUrl: "https://news.sbs.co.kr/sample2",
        author: "박기자",
        category: "entertainment",
        difficulty: "intermediate",
        readingTime: 4,
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
        keywords: ["K-팝", "방탄소년단", "블랙핑크", "한류"],
        tags: ["entertainment", "music", "intermediate"],
        publishedDate: new Date('2024-12-02'),
        views: 2100,
        likes: 156,
        bookmarks: 67,
        status: "active",
        isApproved: true
    },
    {
        title: "한국의 IT 기술 혁신",
        subtitle: "삼성, LG 등 한국 기업들이 반도체와 디스플레이 기술을 선도하고 있습니다",
        content: "한국은 세계 IT 기술의 중심지 중 하나로 자리잡고 있습니다. 삼성전자는 메모리 반도체 분야에서 세계 1위를 유지하고 있으며, LG디스플레이는 OLED 기술을 선도하고 있습니다. 또한 네이버, 카카오 등 한국의 IT 기업들은 인공지능과 플랫폼 서비스 분야에서 혁신을 이어가고 있습니다. 정부의 디지털 뉴딜 정책과 함께 한국의 IT 경쟁력은 더욱 강화될 전망입니다.",
        summary: "한국 IT 기업들의 기술 혁신과 세계 시장 선도",
        source: "연합뉴스",
        originalUrl: "https://yna.co.kr/sample3",
        author: "이기자",
        category: "technology",
        difficulty: "advanced",
        readingTime: 5,
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=500",
        keywords: ["IT기술", "삼성", "LG", "반도체", "인공지능"],
        tags: ["technology", "business", "advanced"],
        publishedDate: new Date('2024-12-02'),
        views: 1800,
        likes: 124,
        bookmarks: 89,
        status: "active",
        isApproved: true
    }
];

const seedNews = async () => {
    try {
        // Clear existing news
        await News.deleteMany({});
        console.log('기존 뉴스 데이터가 삭제되었습니다.');

        // Insert sample news
        await News.insertMany(sampleNewsData);
        console.log('샘플 뉴스 데이터가 추가되었습니다.');
        
    } catch (error) {
        console.error('뉴스 데이터 생성 중 오류:', error);
    }
};

const createAdmin = async () => {
    await connectDB();

    try {
        // Seed news first
        await seedNews();

        const adminExists = await User.findOne({email: process.env.ADMIN_EMAIL});

        if(adminExists) {
            console.log('Tài khoản admin đã tồn tại');
            mongoose.connection.close();
            return;
        }

        const admin = new User({
            name: process.env.ADMIN_NAME || 'Admin',
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            role: 'admin',
            isEmailVerified: true
        });

        await admin.save();

        console.log('Tài khoản admin đã được tạo thành công!');
        
    } catch (error) {
        console.error('Lỗi khi tạo tài khoản admin:', error);

    } finally {
        mongoose.connection.close()
    }
}

createAdmin();