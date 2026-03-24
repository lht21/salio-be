import mongoose from 'mongoose';
const Schema = mongoose.Schema;

export const questionSchema = new Schema({
    type: { 
        type: String, 
        enum: ['single_choice', 'multiple_choice', 'true_false', 'matching', 'fill_in_blank', 'short_answer'],
        required: true 
    },
    questionText: { type: String, required: true },
    metadata: {
        options: [{ type: String }],
        matchingPairs: [{ leftItem: String, rightItem: String }],
        blankCount: Number
    },
    correctAnswer: { type: Schema.Types.Mixed, required: true },
    explanation: { type: String }
}, { _id: true });