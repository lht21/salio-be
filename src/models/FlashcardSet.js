import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const flashcardSetSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cards: [{ type: Schema.Types.ObjectId, ref: 'Vocabulary' }],


    isPublic: { type: Boolean, default: false },
}, { timestamps: true });


export default mongoose.model('FlashcardSet', flashcardSetSchema);

