import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const vocabularySchema = new Schema({
    word: { type: String, required: true, trim: true },
    meaning: { type: String, required: true, trim: true },
    isSinoKorean: { type: Boolean, default: false },
    hanja: { 
        type: String, 
        trim: true,
        required: function() {
            return this.isSinoKorean === true;
        }
    },
    sinoVietnamese: { 
        type: String, 
        trim: true,
        required: function() {
            return this.isSinoKorean === true; 
        }
    },
    type: { type: String, enum: ['noun', 'verb', 'adjective', 'adverb' /* phó từ*/], default: 'noun' },
    pronunciationText: { type: String, trim: true },
    imageUrl: { type: String },
    examples: [{
        korean: { type: String, required: true, trim: true },
        vietnamese: { type: String, required: true, trim: true }
    }],
    level: { type: String, enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'], default: 'Sơ cấp 1' },
    category: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

vocabularySchema.index({ word: 1 });
vocabularySchema.index({ hanja: 1 });
vocabularySchema.index({ level: 1, category: 1 });

export default mongoose.model('Vocabulary', vocabularySchema);
