// models/Vocabulary.js
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const vocabularySchema = new Schema({
    word: { 
        type: String, 
        required: true,
        trim: true
    },
    meaning: { 
        type: String, 
        required: true,
        trim: true
    },
    pronunciation: { 
        type: String, 
        trim: true 
    },
    type: { 
        type: String,
        enum: ['명사', '동사', '형용사', '부사', '대명사', '감탄사'],
        default: '명사'
    },
    category: { 
        type: String, 
        trim: true 
    },
    examples: [{ 
        type: String,
        trim: true
    }],
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        default: 'Sơ cấp 1'
    },
    lesson: { 
        type: Schema.Types.ObjectId, 
        ref: 'Lesson' 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: true 
});

// Index cho tìm kiếm
vocabularySchema.index({ word: 1 });
vocabularySchema.index({ meaning: 1 });
vocabularySchema.index({ level: 1 });
vocabularySchema.index({ lesson: 1 });

export default mongoose.model('Vocabulary', vocabularySchema);