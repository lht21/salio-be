import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import { 
    Lesson, 
    User, 
    Vocabulary, 
    Grammar, 
    Listening, 
    SpeakingExercise as Speaking, 
    Reading, 
    Writing 
} from '../models/index.js';

dotenv.config();

const NUM_LESSONS_PER_LEVEL = 3; // Số bài học cho mỗi cấp độ
const LEVELS = ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'];

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected...');
    } catch (err) {
        console.error('❌ Connection Error:', err);
        process.exit(1);
    }
};

const getRandomSubset = (array, count) => {
    if (!array || array.length === 0) return [];
    return faker.helpers.shuffle(array).slice(0, count);
};

const seedLesson = async () => {
    await connectDB();

    try {
        // console.log('--- 🧹 Đang dọn dẹp dữ liệu Lesson cũ... ---');
        // await Lesson.deleteMany({});

        // 1. Lấy dữ liệu cần thiết để link (Authors, Skills)
        const teachers = await User.find({ role: { $in: ['teacher', 'admin'] } });
        
        if (teachers.length === 0) {
            console.error('⚠️ Cần chạy seedUserData.js trước để có User (Teacher/Admin).');
            process.exit(1);
        }

        // Lấy danh sách ID của các kỹ năng để nhét vào bài học
        const vocabIds = await Vocabulary.find().distinct('_id');
        const grammarIds = await Grammar.find().distinct('_id');
        const listeningIds = await Listening.find().distinct('_id');
        const speakingIds = await Speaking.find().distinct('_id');
        const readingIds = await Reading.find().distinct('_id');
        const writingIds = await Writing.find().distinct('_id');

        console.log(`📊 Tìm thấy: ${vocabIds.length} từ vựng, ${grammarIds.length} ngữ pháp... để phân phối vào bài học.`);

        const lessons = [];
        let totalOrder = 1;

        console.log('--- 🚀 Bắt đầu tạo dữ liệu Lesson giả ---');

        for (const level of LEVELS) {
            for (let i = 1; i <= NUM_LESSONS_PER_LEVEL; i++) {
                const author = faker.helpers.arrayElement(teachers);
                const title = faker.lorem.sentence({ min: 3, max: 6 });
                const isPremium = faker.datatype.boolean(0.3); // 30% là bài premium

                // Chọn random một số kỹ năng để đưa vào bài học này
                // (Trong thực tế cần filter theo level, nhưng ở đây ta random để test UI)
                const lessonVocabs = getRandomSubset(vocabIds, 10);
                const lessonGrammars = getRandomSubset(grammarIds, 3);
                const lessonListenings = getRandomSubset(listeningIds, 1);
                const lessonSpeakings = getRandomSubset(speakingIds, 1);
                const lessonReadings = getRandomSubset(readingIds, 1);
                const lessonWritings = getRandomSubset(writingIds, 1);

                lessons.push({
                    code: `L${totalOrder.toString().padStart(3, '0')}`,
                    title: title.replace('.', ''), // Bỏ dấu chấm cuối câu
                    level: level,
                    author: author._id,
                    description: faker.lorem.paragraph(),
                    thumbnail: faker.image.urlLoremFlickr({ category: 'education' }),
                    order: totalOrder,
                    
                    // Linking content
                    vocabulary: lessonVocabs,
                    grammar: lessonGrammars,
                    listening: lessonListenings,
                    speaking: lessonSpeakings,
                    reading: lessonReadings,
                    writing: lessonWritings,

                    isPremium: isPremium,
                    estimatedDuration: faker.number.int({ min: 30, max: 90 }),
                    
                    viewCount: faker.number.int({ min: 0, max: 1000 }),
                    completionCount: faker.number.int({ min: 0, max: 500 }),
                    averageRating: faker.number.float({ min: 3.5, max: 5, precision: 0.1 }),
                    
                    isPublished: true,
                    isActive: true,
                    status: faker.helpers.arrayElement(['rejected', 'pending']),
                    approvedBy: author._id,
                    approvedAt: faker.date.recent(),
                    publishedAt: faker.date.past()
                });

                totalOrder++;
            }
        }

        await Lesson.insertMany(lessons);
        console.log(`✅ Đã tạo thành công ${lessons.length} bài học trải dài các level.`);
        
        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi Seeder Lesson:', error);
        process.exit(1);
    }
};

seedLesson();