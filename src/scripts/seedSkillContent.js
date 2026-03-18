import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { 
    Vocabulary, 
    Grammar, 
    Listening, 
    Speaking, 
    Reading, 
    Writing, 
    User 
} from '../models/index.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected...');
    } catch (err) {
        console.error('❌ Connection Error:', err);
        process.exit(1);
    }
};

const seedSkillContent = async () => {
    await connectDB();

    try {
        console.log('--- 🧹 Đang dọn dẹp dữ liệu Skill cũ... ---');
        // Xóa dữ liệu cũ để tránh trùng lặp khi chạy lại
        await Promise.all([
            Vocabulary.deleteMany({}),
            Grammar.deleteMany({}),
            Listening.deleteMany({}),
            Speaking.deleteMany({}),
            Reading.deleteMany({}),
            Writing.deleteMany({})
        ]);

        // Lấy User làm tác giả (Teacher hoặc Admin)
        const author = await User.findOne({ role: { $in: ['teacher', 'admin'] } });
        if (!author) {
            console.error('⚠️ Cần chạy seedUserData.js trước để có User (Teacher/Admin) làm tác giả.');
            process.exit(1);
        }
        const authorId = author._id;

        console.log('--- 🚀 Bắt đầu tạo dữ liệu Skill (Mỗi loại 3 items) ---');

        // ==========================================
        // 1. VOCABULARY (3 items)
        // ==========================================
        const vocabData = [
            {
                word: '학교',
                meaning: 'Trường học',
                pronunciation: 'hak-gyo',
                type: '명사', // Danh từ
                category: 'Giáo dục',
                examples: ['학교에 갑니다 (Tôi đi đến trường).', '우리 학교는 큽니다 (Trường tôi lớn).'],
                level: 'Sơ cấp 1',
                isActive: true
            },
            {
                word: '사랑하다',
                meaning: 'Yêu',
                pronunciation: 'sa-rang-ha-da',
                type: '동사', // Động từ
                category: 'Cảm xúc',
                examples: ['저는 당신을 사랑합니다 (Tôi yêu bạn).', '가족을 사랑해요 (Tôi yêu gia đình).'],
                level: 'Sơ cấp 1',
                isActive: true
            },
            {
                word: '맛있다',
                meaning: 'Ngon',
                pronunciation: 'ma-sit-da',
                type: '형용사', // Tính từ
                category: 'Ẩm thực',
                examples: ['이 김치는 맛있어요 (Kimchi này ngon).', '비빔밥이 참 맛있습니다 (Cơm trộn rất ngon).'],
                level: 'Sơ cấp 1',
                isActive: true
            }
        ];
        await Vocabulary.insertMany(vocabData);
        console.log('✅ Đã tạo 3 Vocabulary');

        // ==========================================
        // 2. GRAMMAR (3 items)
        // ==========================================
        const grammarData = [
            {
                structure: 'N + 입니다',
                meaning: 'Là...',
                explanation: 'Đuôi câu kính ngữ dùng để định nghĩa hoặc giới thiệu chủ ngữ.',
                usage: 'Dùng trong các tình huống trang trọng.',
                level: 'Sơ cấp 1',
                exampleSentences: [
                    { korean: '저는 학생입니다.', vietnamese: 'Tôi là học sinh.' },
                    { korean: '이것은 책입니다.', vietnamese: 'Đây là quyển sách.' }
                ],
                isActive: true
            },
            {
                structure: 'N + 은/는',
                meaning: 'Tiểu từ chủ ngữ',
                explanation: 'Gắn sau danh từ để chỉ danh từ đó là chủ đề của câu.',
                usage: '은 dùng khi có patchim, 는 dùng khi không có patchim.',
                level: 'Sơ cấp 1',
                exampleSentences: [
                    { korean: '저는 베트남 사람입니다.', vietnamese: 'Tôi là người Việt Nam.' },
                    { korean: '이름은 무엇입니까?', vietnamese: 'Tên bạn là gì?' }
                ],
                isActive: true
            },
            {
                structure: 'V/A + 습니다/봅니다',
                meaning: 'Đuôi câu trần thuật trang trọng',
                explanation: 'Dùng để kết thúc câu một cách lịch sự, trang trọng.',
                usage: '습니다 dùng cho gốc từ có patchim, 봅니다 dùng cho gốc từ không có patchim.',
                level: 'Sơ cấp 1',
                exampleSentences: [
                    { korean: '학교에 갑니다.', vietnamese: 'Tôi đi đến trường.' },
                    { korean: '김치를 먹습니다.', vietnamese: 'Tôi ăn kim chi.' }
                ],
                isActive: true
            }
        ];
        await Grammar.insertMany(grammarData);
        console.log('✅ Đã tạo 3 Grammar');

        // ==========================================
        // 3. LISTENING (3 items)
        // ==========================================
        const listeningData = [
            {
                title: 'Chào hỏi cơ bản',
                audioUrl: 'https://example.com/audio/greeting.mp3', // Link giả
                transcript: 'A: 안녕하세요? B: 네, 안녕하세요. 만나서 반갑습니다.',
                translation: 'A: Xin chào? B: Vâng, xin chào. Rất vui được gặp bạn.',
                level: 'Sơ cấp 1',
                duration: 15,
                difficulty: 'Dễ',
                author: authorId,
                questions: [{
                    question: 'Hai người đang làm gì?',
                    options: ['Đang ăn', 'Đang chào hỏi', 'Đang ngủ', 'Đang mua sắm'],
                    answer: 1, // Index 1 = Đang chào hỏi
                    explanation: 'Họ dùng câu 안녕하세요 (Xin chào).'
                }]
            },
            {
                title: 'Mua sắm tại cửa hàng',
                audioUrl: 'https://example.com/audio/shopping.mp3',
                transcript: 'A: 이거 얼마예요? B: 오천 원입니다.',
                translation: 'A: Cái này bao nhiêu tiền? B: 5,000 won ạ.',
                level: 'Sơ cấp 1',
                duration: 20,
                difficulty: 'Dễ',
                author: authorId,
                questions: [{
                    question: 'Món đồ giá bao nhiêu?',
                    options: ['1,000 won', '5,000 won', '10,000 won', '50,000 won'],
                    answer: 1,
                    explanation: '오천 원 (O-cheon won) là 5,000 won.'
                }]
            },
            {
                title: 'Hỏi đường',
                audioUrl: 'https://example.com/audio/direction.mp3',
                transcript: 'A: 화장실이 어디에 있어요? B: 저기에 있어요.',
                translation: 'A: Nhà vệ sinh ở đâu? B: Ở đằng kia.',
                level: 'Sơ cấp 1',
                duration: 18,
                difficulty: 'Trung bình',
                author: authorId,
                questions: [{
                    question: 'Người A đang tìm gì?',
                    options: ['Nhà hàng', 'Trường học', 'Nhà vệ sinh', 'Bệnh viện'],
                    answer: 2,
                    explanation: '화장실 (Hwa-jang-sil) nghĩa là nhà vệ sinh.'
                }]
            }
        ];
        await Listening.insertMany(listeningData);
        console.log('✅ Đã tạo 3 Listening');

        // ==========================================
        // 4. SPEAKING (3 items)
        // ==========================================
        const speakingData = [
            {
                title: 'Giới thiệu bản thân',
                type: 'self_introduction',
                prompt: 'Hãy giới thiệu tên và quốc tịch của bạn bằng tiếng Hàn.',
                instruction: 'Sử dụng cấu trúc "저는 ...입니다".',
                level: 'Sơ cấp 1',
                duration: 60,
                recordingLimit: 30,
                targetSentence: '안녕하세요. 저는 [Tên]입니다. 베트남 사람입니다.',
                sampleAnswer: '안녕하세요. 저는 남입니다. 저는 베트남 사람입니다.',
                sampleTranslation: 'Xin chào. Tôi là Nam. Tôi là người Việt Nam.',
                author: authorId,
                isActive: true
            },
            {
                title: 'Mô tả đồ vật',
                type: 'description',
                prompt: 'Hãy nhìn hình và nói tên đồ vật (Cái ghế).',
                instruction: 'Nói to từ vựng tiếng Hàn tương ứng.',
                level: 'Sơ cấp 1',
                duration: 30,
                recordingLimit: 10,
                targetSentence: '의자입니다.',
                wordHint: ['의자 (Ghế)'],
                sampleAnswer: '이것은 의자입니다.',
                author: authorId,
                isActive: true
            },
            {
                title: 'Hội thoại mua hàng',
                type: 'role_play',
                prompt: 'Bạn đang ở cửa hàng. Hãy hỏi giá của quả táo.',
                instruction: 'Đóng vai khách hàng.',
                level: 'Sơ cấp 1',
                duration: 45,
                recordingLimit: 20,
                targetSentence: '사과 얼마예요?',
                sampleAnswer: '아줌마, 사과 얼마예요?',
                author: authorId,
                isActive: true
            }
        ];
        // Lưu ý: Import Speaking có thể là object hoặc model tùy file index.js, nhưng ở đây dùng model Speaking
        await Speaking.insertMany(speakingData);
        console.log('✅ Đã tạo 3 Speaking');

        // ==========================================
        // 5. READING (3 items)
        // ==========================================
        const readingData = [
            {
                title: 'Gia đình của tôi',
                content: '우리 가족은 네 명입니다. 아버지, 어머니, 형, 그리고 저입니다. 아버지는 의사입니다. 어머니는 선생님입니다.',
                translation: 'Gia đình tôi có 4 người. Bố, mẹ, anh trai và tôi. Bố là bác sĩ. Mẹ là giáo viên.',
                level: 'Sơ cấp 1',
                difficulty: 'Dễ',
                author: authorId,
                questions: [
                    {
                        question: 'Gia đình có mấy người?',
                        options: ['3 người', '4 người', '5 người', '6 người'],
                        answer: 1, // Index 1 = 4 người
                        explanation: 'Trong bài có câu "우리 가족은 네 명입니다" (Gia đình tôi là 4 người).'
                    },
                    {
                        question: 'Mẹ làm nghề gì?',
                        options: ['Bác sĩ', 'Giáo viên', 'Nội trợ', 'Học sinh'],
                        answer: 1,
                        explanation: '어머니는 선생님입니다 (Mẹ là giáo viên).'
                    }
                ]
            },
            {
                title: 'Sở thích',
                content: '저는 영화를 좋아합니다. 주말에 친구와 영화관에 갑니다. 한국 영화가 재미있습니다.',
                translation: 'Tôi thích phim ảnh. Cuối tuần tôi đi rạp chiếu phim với bạn. Phim Hàn Quốc rất thú vị.',
                level: 'Sơ cấp 1',
                difficulty: 'Trung bình',
                author: authorId,
                questions: [
                    {
                        question: 'Nhân vật chính thích gì?',
                        options: ['Âm nhạc', 'Sách', 'Phim ảnh', 'Thể thao'],
                        answer: 2,
                        explanation: '영화를 좋아합니다 (Thích phim).'
                    }
                ]
            },
            {
                title: 'Thời tiết hôm nay',
                content: '오늘은 날씨가 좋습니다. 하늘이 파랗습니다. 공원에 사람이 많습니다.',
                translation: 'Hôm nay thời tiết đẹp. Bầu trời xanh. Có nhiều người ở công viên.',
                level: 'Sơ cấp 1',
                difficulty: 'Dễ',
                author: authorId,
                questions: [
                    {
                        question: 'Thời tiết hôm nay thế nào?',
                        options: ['Mưa', 'Tuyết', 'Đẹp', 'Lạnh'],
                        answer: 2,
                        explanation: '날씨가 좋습니다 (Thời tiết tốt/đẹp).'
                    }
                ]
            }
        ];
        await Reading.insertMany(readingData);
        console.log('✅ Đã tạo 3 Reading');

        // ==========================================
        // 6. WRITING (3 items)
        // ==========================================
        const writingData = [
            {
                title: 'Viết về bản thân',
                type: 'paragraph',
                prompt: 'Hãy viết một đoạn văn ngắn (3-5 câu) giới thiệu về bản thân (Tên, tuổi, nghề nghiệp).',
                instruction: 'Sử dụng kính ngữ -입니다/습니다.',
                minWords: 20,
                level: 'Sơ cấp 1',
                difficulty: 'Dễ',
                wordHint: ['이름 (Tên)', '나이 (Tuổi)', '직업 (Nghề nghiệp)'],
                sampleAnswer: '안녕하세요. 제 이름은 밍입니다. 저는 스무 살입니다. 저는 대학생입니다. 만나서 반갑습니다.',
                author: authorId,
                isActive: true
            },
            {
                title: 'Đặt câu với từ vựng',
                type: 'sentence',
                prompt: 'Hãy đặt câu với từ "학교" (Trường học).',
                instruction: 'Viết 1 câu hoàn chỉnh.',
                minWords: 3,
                level: 'Sơ cấp 1',
                difficulty: 'Dễ',
                sampleAnswer: '저는 매일 학교에 갑니다.',
                author: authorId,
                isActive: true
            },
            {
                title: 'Viết email xin nghỉ học',
                type: 'email',
                prompt: 'Bạn bị ốm. Hãy viết email ngắn xin giáo viên nghỉ học hôm nay.',
                instruction: 'Nêu lý do bị ốm.',
                minWords: 30,
                level: 'Sơ cấp 1',
                difficulty: 'Trung bình',
                wordHint: ['아프다 (Đau/Ốm)', '결석 (Vắng mặt)', '죄송합니다 (Xin lỗi)'],
                sampleAnswer: '선생님, 안녕하세요. 저는 오늘 몸이 아파서 학교에 갈 수 없습니다. 정말 죄송합니다.',
                author: authorId,
                isActive: true
            }
        ];
        await Writing.insertMany(writingData);
        console.log('✅ Đã tạo 3 Writing');

        console.log('\n🎉 Seed Skill Content thành công! Bây giờ bạn có thể chạy seedLesson.js.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi Seeder Skill:', error);
        process.exit(1);
    }
};

seedSkillContent();