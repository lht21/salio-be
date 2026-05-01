import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const SECTION_TYPES = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
const MODULE_TYPES = [
    'vocabulary',
    'vocabularyQuiz',
    'grammar',
    'grammarQuiz',
    'listening',
    'speaking',
    'reading',
    'writing'
];

const progressResultRefSchema = new Schema({
    kind: {
        type: String,
        enum: [
            'VocabularyQuizSession',
            'GrammarQuizSession',
            'QuizSession',
            'SpeakingSubmission',
            'WritingSubmission',
            'Manual'
        ],
        default: 'Manual'
    },
    refId: { type: Schema.Types.ObjectId }
}, { _id: false });

const sectionItemProgressSchema = new Schema({
    moduleType: { type: String, enum: MODULE_TYPES, required: true },
    itemId: { type: Schema.Types.ObjectId, required: true },
    status: {
        type: String,
        enum: ['locked', 'learning', 'completed'],
        default: 'locked'
    },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 100 },
    percentage: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    resultRef: progressResultRefSchema,
    breakdown: { type: Schema.Types.Mixed },
    completedAt: { type: Date },
    lastAccessed: { type: Date }
}, { _id: false });

const sectionProgressSchema = new Schema({
    isUnlocked: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    isRewardClaimed: { type: Boolean, default: false },
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
        isUnlocked: { type: Boolean, default: false },
        isPassed: { type: Boolean, default: false },
        passingScore: { type: Number, default: 80 },
        highestScore: { type: Number, default: 0 },
        attempts: { type: Number, default: 0 },
        isRewardClaimed: { type: Boolean, default: false }
    },

    overallProgress: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    resumePoint: {
        section: { type: String, enum: SECTION_TYPES },
        moduleType: { type: String, enum: MODULE_TYPES },
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
            if (this.sections[key]) {
                this.sections[key].isUnlocked = true;
                this.sections[key].progress = 100; // Tự động hoàn thành 100% khi qua Final Test
            }
        });
        return next();
    }

    const sections = this.sections;
    let totalProgress = 0;
    let activeSections = 0;
    let previousCompleted = true;

    SECTION_TYPES.forEach(sectionName => {
        const section = sections[sectionName];
        if (!section || section.totalItems === 0) return;

        section.isUnlocked = sectionName === 'vocabulary' || previousCompleted || section.isUnlocked;
        section.completedCount = section.items.filter(item => item.status === 'completed').length;
        section.progress = Math.round((section.completedCount / section.totalItems) * 100);
        section.isCompleted = section.progress === 100;

        const completedItems = section.items.filter(item => item.status === 'completed');
        if (completedItems.length > 0) {
            const totalScore = completedItems.reduce((sum, item) => sum + (item.percentage || 0), 0);
            section.averageScore = Math.round(totalScore / completedItems.length);
            section.highestScore = Math.max(...completedItems.map(item => item.percentage || 0));
        }

        totalProgress += section.progress;
        activeSections += 1;
        previousCompleted = section.isCompleted;
    });

    this.finalTestStatus.isUnlocked = activeSections > 0
        && SECTION_TYPES.every(sectionName => {
            const section = sections[sectionName];
            return !section || section.totalItems === 0 || section.isCompleted;
        });

    this.overallProgress = activeSections > 0 ? Math.round(totalProgress / activeSections) : 0;
    this.isCompleted = this.finalTestStatus.isPassed === true;
});

lessonProgressSchema.index({ user: 1, lesson: 1 }, { unique: true });

lessonProgressSchema.methods.claimRewards = async function () {
    let earnedClouds = 0;
    const keys = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];

    if (this.finalTestStatus.isPassed) {
        // 1. Thưởng 50 mây cho bài Final Test (nếu chưa nhận)
        if (!this.finalTestStatus.isRewardClaimed) {
            earnedClouds += 50;
            this.finalTestStatus.isRewardClaimed = true;
        }

        // 2. Thưởng bù đắp (Retroactive) cho các kỹ năng chưa nhận thưởng
        keys.forEach(key => {
            const section = this.sections[key];
            if (section && !section.isRewardClaimed) {
                earnedClouds += 10;
                section.isRewardClaimed = true;
            }
        });
    } else {
        // Luồng học tuần tự: Kỹ năng nào đạt 100% thì thưởng 10 mây
        keys.forEach(key => {
            const section = this.sections[key];
            if (section && section.progress === 100 && !section.isRewardClaimed) {
                earnedClouds += 10;
                section.isRewardClaimed = true;
            }
        });
    }

    // 3. Tự động cộng mây vào tài khoản User
    if (earnedClouds > 0) {
        const UserProgress = mongoose.model('UserProgress');
        let progress = await UserProgress.findOne({ user: this.user });
        if (progress) {
            progress.addClouds(earnedClouds);
            await progress.save();
        }
    }

    return earnedClouds;
};

export default mongoose.model('LessonProgress', lessonProgressSchema);
