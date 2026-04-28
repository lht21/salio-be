import mongoose from 'mongoose';
import { questionSchema } from '../schemas/question.schema.js';

const { Schema } = mongoose;

const grammarQuestionSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String },
    grammar: { type: Schema.Types.ObjectId, ref: 'Grammar' },
    questions: {
        type: [questionSchema],
        validate: {
            validator: function(questions) {
                return questions.every(question => ['single_choice', 'short_answer'].includes(question.type));
            },
            message: 'Grammar question bank chỉ hỗ trợ single_choice và short_answer'
        },
        default: []
    },
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6']
    },
    difficulty: {
        type: String,
        enum: ['Dễ', 'Trung bình', 'Khó'],
        default: 'Dễ'
    },
    tags: [{ type: String, trim: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

grammarQuestionSchema.index({ grammar: 1 });
grammarQuestionSchema.index({ level: 1, tags: 1 });

export default mongoose.model('GrammarQuestion', grammarQuestionSchema);
