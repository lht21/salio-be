// models/Grammar.js
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const grammarSchema = new Schema({
    structure: { type: String, required: true },
    meaning: { type: String, required: true },
    explanation: { type: String, required: true },
    usage: { type: String },
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        default: 'Sơ cấp 1'
    },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    exampleSentences: [{
        korean: { type: String, required: true },
        vietnamese: { type: String, required: true }
    }],
    similarGrammar: [{ type: String }],
    isActive: { type: Boolean, default: true }
}, { 
    timestamps: true 
});

// Index cho tìm kiếm
grammarSchema.index({ structure: 1 });
grammarSchema.index({ level: 1 });
grammarSchema.index({ meaning: 1 });

export default mongoose.model('Grammar', grammarSchema);