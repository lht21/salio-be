import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const sectionProgressSchema = new Schema({
    isUnlocked: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    items: [{
        itemId: { type: Schema.Types.ObjectId, required: true },
        status: { type: String, enum: ['locked', 'learning', 'completed'], default: 'locked' },
        score: { type: Number, default: 0 }
    }]
}, { _id: false });

const lessonProgressSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    isUnlocked: { type: Boolean, default: false },
    
    finalTestStatus: {
        isPassed: { type: Boolean, default: false },
        highestScore: { type: Number, default: 0 },
        attempts: { type: Number, default: 0 }
    },
    overallProgress: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    resumePoint: {
        section: { type: String, enum: ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'] },
        itemId: { type: Schema.Types.ObjectId },
        title: { type: String }
    },
    sections: {
        vocabulary: { type: sectionProgressSchema, default: () => ({ isUnlocked: true }) },
        grammar: { type: sectionProgressSchema, default: () => ({}) },
        listening: { type: sectionProgressSchema, default: () => ({}) },
        speaking: { type: sectionProgressSchema, default: () => ({}) },
        reading: { type: sectionProgressSchema, default: () => ({}) },
        writing: { type: sectionProgressSchema, default: () => ({}) }
    },
    lastAccessed: { type: Date, default: Date.now }
}, { timestamps: true });

lessonProgressSchema.pre('save', function (next) {
    if (this.finalTestStatus.isPassed === true) {
        this.overallProgress = 100;
        this.isCompleted = true;
        const keys = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
        keys.forEach(key => {
            if (this.sections[key]) this.sections[key].isUnlocked = true;
        });
        return next();
    }

    const sections = this.sections;
    const keys = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
    let totalProgress = 0, activeSections = 0;

    keys.forEach(key => {
        const section = sections[key];
        if (section && section.totalItems > 0) {
            section.progress = Math.round((section.completedCount / section.totalItems) * 100);
            totalProgress += section.progress;
            activeSections++;

            if (section.progress === 100) {
                const nextKey = keys[keys.indexOf(key) + 1];
                if (nextKey && sections[nextKey].totalItems > 0) {
                    sections[nextKey].isUnlocked = true;
                }
            }
        }
    });

    if (activeSections > 0) this.overallProgress = Math.round(totalProgress / activeSections);
    if (this.overallProgress === 100) this.isCompleted = true;
    next();
});

lessonProgressSchema.index({ user: 1, lesson: 1 }, { unique: true });

export default mongoose.model('LessonProgress', lessonProgressSchema);