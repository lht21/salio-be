import mongoose from 'mongoose';

const { Schema } = mongoose;

const grammarQuizSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String },
    grammar: { type: Schema.Types.ObjectId, ref: 'Grammar' },
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6']
    },
    category: { type: String, trim: true },
    items: [{ type: Schema.Types.ObjectId, ref: 'GrammarQuestion' }],
    timeLimit: { type: Number, default: 300 },
    passingScore: { type: Number, default: 80 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: false }
}, { timestamps: true });

grammarQuizSchema.index({ grammar: 1, isActive: 1, updatedAt: -1 });
grammarQuizSchema.index({ level: 1, category: 1, isActive: 1 });

export default mongoose.model('GrammarQuiz', grammarQuizSchema);
