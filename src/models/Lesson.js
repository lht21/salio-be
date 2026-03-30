import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const lessonSchema = new Schema({
    code: { type: String, required: true },
    title: { type: String, required: true },
    level: { type: String, enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'], required: true },
    description: { type: String },
    thumbnail: { type: String },
    order: { type: Number, required: true },
    
    vocabulary: [{ type: Schema.Types.ObjectId, ref: 'Vocabulary' }],
    grammar: [{ type: Schema.Types.ObjectId, ref: 'Grammar' }],
    listening: [{ type: Schema.Types.ObjectId, ref: 'Listening' }],
    speaking: [{ type: Schema.Types.ObjectId, ref: 'Speaking' }],
    reading: [{ type: Schema.Types.ObjectId, ref: 'Reading' }],
    writing: [{ type: Schema.Types.ObjectId, ref: 'Writing' }],
    
    finalTest: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    isPremium: { type: Boolean, default: false },
    estimatedDuration: { type: Number, default: 60 },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

lessonSchema.virtual('totalComponents').get(function() {
    return (this.vocabulary?.length || 0) + (this.grammar?.length || 0) + 
           (this.listening?.length || 0) + (this.speaking?.length || 0) + 
           (this.reading?.length || 0) + (this.writing?.length || 0);
});

export default mongoose.model('Lesson', lessonSchema);