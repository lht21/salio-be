// scripts/updateLessonSkills.js
import mongoose from 'mongoose';
import { Lesson, Vocabulary, Grammar } from '../models/index.js';

const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://lehuytran213:xFRmBaZPZoErK8G1@cluster0-lehuytran.7ne5fqh.mongodb.net/k_wave';

const updateLessonSkills = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('Đã kết nối MongoDB thành công!');

        // Lấy all vocabulary và grammar
        const vocabularies = await Vocabulary.find({});
        const grammars = await Grammar.find({});

        console.log(`Found ${vocabularies.length} vocabularies and ${grammars.length} grammars`);

        // Lấy lesson đầu tiên (bảng chữ cái)
        const firstLesson = await Lesson.findOne({ order: 1 });
        if (!firstLesson) {
            console.log('Không tìm thấy lesson để update');
            return;
        }

        console.log(`Updating lesson: ${firstLesson.title}`);

        // Update lesson với vocabulary và grammar IDs
        firstLesson.vocabulary = vocabularies.map(v => v._id);
        firstLesson.grammar = grammars.map(g => g._id);

        await firstLesson.save();

        console.log('✅ Updated lesson với skills:');
        console.log(`📝 Vocabulary: ${firstLesson.vocabulary.length} items`);
        console.log(`📚 Grammar: ${firstLesson.grammar.length} items`);

        // Verify với populate
        const updatedLesson = await Lesson.findById(firstLesson._id)
            .populate('vocabulary')
            .populate('grammar');

        console.log('\n📋 Lesson skills populated:');
        console.log('Vocabularies:', updatedLesson.vocabulary.map(v => v.koreanWord));
        console.log('Grammars:', updatedLesson.grammar.map(g => g.structure));

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi update lesson skills:', error);
        process.exit(1);
    }
};

updateLessonSkills();