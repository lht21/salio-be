import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const speakingScriptSchema = new Schema({
    speaker: { type: String },
    korean: { type: String, required: true },
    vietnamese: { type: String },
    startTime: { type: Number },
    endTime: { type: Number }
});

const speakingCriteriaSchema = new Schema({
    pronunciation: { type: Number, default: 25 },
    intonation: { type: Number, default: 25 },
    accuracy: { type: Number, default: 25 },
    fluency: { type: Number, default: 25 }
}, { _id: false });

const speakingSchema = new Schema({
    title: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ['pronunciation', 'shadowing', 'role_play', 'presentation', 'free_talk'],
        required: true
    },
    prompt: { type: String, required: true },
    instruction: { type: String },

    referenceAudioUrl: { type: String },
    scripts: [speakingScriptSchema],

    targetVocabularies: [{ type: String }],
    targetGrammar: [{ type: String }],
    sampleAnswer: { type: String },
    sampleTranslation: { type: String },

    prepTime: { type: Number, default: 60 },
    recordingLimit: { type: Number, default: 120 },

    scoringCriteria: { type: speakingCriteriaSchema, default: () => ({}) },
    passingScore: { type: Number, default: 70 },

    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        required: true
    },
    tags: [{ type: String, trim: true }],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

speakingSchema.virtual('estimatedCompletionTime').get(function () {
    return (this.prepTime || 0) + (this.recordingLimit || 0);
});

speakingSchema.index({ level: 1 });
speakingSchema.index({ type: 1 });
speakingSchema.index({ title: 'text', prompt: 'text' });
speakingSchema.index({ createdBy: 1 });
speakingSchema.index({ tags: 1 });

export default mongoose.model('Speaking', speakingSchema);
