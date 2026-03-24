import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const grammarSchema = new Schema({
    structure: { type: String, required: true, trim: true },
    meaning: { type: String, required: true, trim: true },
    explanation: { type: String, required: true },
    usage: { type: String },
    exampleSentences: [{
        korean: { type: String, required: true, trim: true },
        vietnamese: { type: String, required: true, trim: true }
    }],
    similarGrammar: [{ type: Schema.Types.ObjectId, ref: 'Grammar' }],
    level: { type: String, enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'], default: 'Sơ cấp 1' },
    tags: [{ type: String, trim: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

grammarSchema.index({ structure: 1 });
grammarSchema.index({ level: 1, tags: 1 });

export default mongoose.model('Grammar', grammarSchema);