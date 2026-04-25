import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const examSchema = new Schema({
    title: { type: String, required: true, trim: true },
    examType: { type: String, enum: ['topik1', 'topik2', 'eps'], required: true },
    sections: {
        listening: [{ type: Schema.Types.ObjectId, ref: 'Listening' }],
        reading: [{ type: Schema.Types.ObjectId, ref: 'Reading' }],
        writing: [{ type: Schema.Types.ObjectId, ref: 'Writing' }]
    },
    duration: {
        listening: { type: Number, default: 60 },
        reading: { type: Number, default: 70 },
        writing: { type: Number, default: 50 }
    },
    totalScore: { type: Number, default: 300 },
    isPremium: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Exam', examSchema);