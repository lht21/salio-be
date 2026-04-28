import Lesson from '../models/Lesson.js';
import LessonProgress from '../models/LessonProgress.js';

const LESSON_SECTIONS = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];

const getIdString = (value) => {
    if (!value) return '';
    if (value._id) return value._id.toString();
    return value.toString();
};

const getProgressItemRefs = (lesson, sectionName) => {
    if (sectionName === 'vocabulary') {
        return [
            ...(lesson.vocabulary || []).map(itemId => ({ moduleType: 'vocabulary', itemId })),
            ...(lesson.vocabularyQuizzes || []).map(itemId => ({ moduleType: 'vocabularyQuiz', itemId }))
        ];
    }

    if (sectionName === 'grammar') {
        return [
            ...(lesson.grammar || []).map(itemId => ({ moduleType: 'grammar', itemId })),
            ...(lesson.grammarQuizzes || []).map(itemId => ({ moduleType: 'grammarQuiz', itemId }))
        ];
    }

    return (lesson[sectionName] || []).map(itemId => ({ moduleType: sectionName, itemId }));
};

const buildSectionProgress = (lesson, sectionName, isUnlocked) => {
    const items = getProgressItemRefs(lesson, sectionName);

    return {
        isUnlocked,
        totalItems: items.length,
        completedCount: 0,
        progress: 0,
        items: items.map(({ moduleType, itemId }) => ({
            moduleType,
            itemId,
            status: isUnlocked ? 'learning' : 'locked',
            score: 0,
            maxScore: 100,
            percentage: 0,
            attempts: 0
        }))
    };
};

const buildInitialProgress = (lesson, userId) => {
    const sections = {};
    let firstUnlocked = false;

    LESSON_SECTIONS.forEach(sectionName => {
        const hasItems = getProgressItemRefs(lesson, sectionName).length > 0;
        const shouldUnlock = hasItems && !firstUnlocked;
        if (shouldUnlock) firstUnlocked = true;
        sections[sectionName] = buildSectionProgress(lesson, sectionName, shouldUnlock);
    });

    return {
        user: userId,
        lesson: lesson._id,
        isUnlocked: true,
        sections,
        overallProgress: 0,
        isCompleted: false,
        lastAccessed: new Date()
    };
};

const ensureSectionItems = (progress, lesson, sectionName) => {
    if (!progress.sections[sectionName]) {
        progress.sections[sectionName] = buildSectionProgress(lesson, sectionName, false);
    }

    const section = progress.sections[sectionName];
    const existingKeys = new Set((section.items || []).map(item => {
        return `${item.moduleType}:${getIdString(item.itemId)}`;
    }));

    getProgressItemRefs(lesson, sectionName).forEach(({ moduleType, itemId }) => {
        const key = `${moduleType}:${getIdString(itemId)}`;
        if (existingKeys.has(key)) return;

        section.items.push({
            moduleType,
            itemId,
            status: section.isUnlocked ? 'learning' : 'locked',
            score: 0,
            maxScore: 100,
            percentage: 0,
            attempts: 0
        });
        existingKeys.add(key);
    });

    section.totalItems = section.items.length;
};

export const ensureLessonProgressForUser = async ({ userId, lesson }) => {
    let progress = await LessonProgress.findOne({ user: userId, lesson: lesson._id });

    if (!progress) {
        progress = new LessonProgress(buildInitialProgress(lesson, userId));
    } else {
        LESSON_SECTIONS.forEach(sectionName => ensureSectionItems(progress, lesson, sectionName));
        progress.lastAccessed = new Date();
    }

    await progress.save();
    return progress;
};

export const updateLessonProgressItem = async ({
    userId,
    lesson,
    sectionType,
    moduleType,
    itemId,
    status = 'completed',
    percentage = 0,
    score = percentage,
    maxScore = 100,
    resultKind = 'Manual',
    resultId,
    breakdown,
    title
}) => {
    const progress = await ensureLessonProgressForUser({ userId, lesson });
    const section = progress.sections[sectionType];
    if (!section) return progress;

    const item = section.items.find(sectionItem => {
        return sectionItem.moduleType === moduleType
            && getIdString(sectionItem.itemId) === getIdString(itemId);
    });

    if (!item) return progress;

    item.status = status;
    item.score = score;
    item.maxScore = maxScore;
    item.percentage = percentage;
    item.attempts = (item.attempts || 0) + 1;
    item.breakdown = breakdown;
    item.lastAccessed = new Date();
    if (status === 'completed') item.completedAt = new Date();
    if (resultId) item.resultRef = { kind: resultKind, refId: resultId };

    progress.resumePoint = {
        section: sectionType,
        moduleType,
        itemId,
        title
    };
    progress.lastAccessed = new Date();
    await progress.save();
    return progress;
};

export const updateLessonProgressForQuiz = async ({
    userId,
    quizId,
    sectionType,
    moduleType,
    resultKind,
    resultId,
    percentage,
    score,
    maxScore
}) => {
    const lessonField = sectionType === 'grammar' ? 'grammarQuizzes' : 'vocabularyQuizzes';
    const lesson = await Lesson.findOne({
        isDeleted: false,
        [lessonField]: quizId
    });

    if (!lesson) return null;

    return updateLessonProgressItem({
        userId,
        lesson,
        sectionType,
        moduleType,
        itemId: quizId,
        status: 'completed',
        percentage,
        score,
        maxScore,
        resultKind,
        resultId
    });
};
