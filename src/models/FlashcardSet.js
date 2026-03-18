import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const flashcardSetSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    coverImage: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cards: [{ type: Schema.Types.ObjectId, ref: 'Vocabulary' }],
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6']
    },
    category: { type: String }, // "Từ vựng bài 1", "Ngữ pháp TOPIK"
    tags: [{ type: String }],
    isPublic: { type: Boolean, default: false },
    isOfficial: { type: Boolean, default: false }, // Bộ flashcard chính thức
    viewCount: { type: Number, default: 0 },
    studyCount: { type: Number, default: 0 }, // Số lượt học
    difficulty: {
        type: String,
        enum: ['Dễ', 'Trung bình', 'Khó'],
        default: 'Trung bình'
    },
}, { timestamps: true });

export default mongoose.model('FlashcardSet', flashcardSetSchema);