import mongoose from 'mongoose';

const { Schema } = mongoose;

const vocabularyQuizSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String },
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6']
    },
    category: { type: String, trim: true },
    items: [{ type: Schema.Types.ObjectId, ref: 'VocabularyQuestion' }],
    timeLimit: { type: Number, default: 300 },
    passingScore: { type: Number, default: 80 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: false }
}, { timestamps: true });

vocabularyQuizSchema.index({ isActive: 1, level: 1, category: 1, updatedAt: -1 });

export default mongoose.model('VocabularyQuiz', vocabularyQuizSchema);
