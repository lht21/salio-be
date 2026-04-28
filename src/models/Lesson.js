import mongoose from 'mongoose';

const Schema = mongoose.Schema;

export const LESSON_LEVELS = ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'];

const lessonSchema = new Schema({
    code: { type: String, required: true, trim: true, unique: true },
    title: { type: String, required: true, trim: true },
    level: { type: String, enum: LESSON_LEVELS, required: true },
    description: { type: String },
    thumbnail: { type: String },
    order: { type: Number, required: true },

    vocabulary: [{ type: Schema.Types.ObjectId, ref: 'Vocabulary' }],
    vocabularyQuizzes: [{ type: Schema.Types.ObjectId, ref: 'VocabularyQuiz' }],
    grammar: [{ type: Schema.Types.ObjectId, ref: 'Grammar' }],
    grammarQuizzes: [{ type: Schema.Types.ObjectId, ref: 'GrammarQuiz' }],
    listening: [{ type: Schema.Types.ObjectId, ref: 'Listening' }],
    speaking: [{ type: Schema.Types.ObjectId, ref: 'Speaking' }],
    reading: [{ type: Schema.Types.ObjectId, ref: 'Reading' }],
    writing: [{ type: Schema.Types.ObjectId, ref: 'Writing' }],

    finalTest: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    isPremium: { type: Boolean, default: false },
    estimatedDuration: { type: Number, default: 60 },
    isPublished: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

lessonSchema.virtual('totalComponents').get(function () {
    return (this.vocabulary?.length || 0)
        + (this.vocabularyQuizzes?.length || 0)
        + (this.grammar?.length || 0)
        + (this.grammarQuizzes?.length || 0)
        + (this.listening?.length || 0)
        + (this.speaking?.length || 0)
        + (this.reading?.length || 0)
        + (this.writing?.length || 0)
        + (this.finalTest ? 1 : 0);
});

lessonSchema.index({ level: 1, order: 1 });
lessonSchema.index({ isPublished: 1, isDeleted: 1, order: 1 });

export default mongoose.model('Lesson', lessonSchema);
