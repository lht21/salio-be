import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const clampScore = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
};

const parseJsonObject = (text) => {
    if (!text) throw new Error('Gemini did not return an assessment result');
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
};

const getAudioMimeType = (audioUrl) => {
    const ext = path.extname(new URL(audioUrl).pathname).toLowerCase();
    const mimeTypes = {
        '.mp3': 'audio/mpeg',
        '.mpeg': 'audio/mpeg',
        '.mpga': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.webm': 'audio/webm',
        '.ogg': 'audio/ogg',
        '.oga': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.mp4': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac'
    };

    return mimeTypes[ext] || 'audio/wav';
};

const downloadAudioAsBase64 = async (audioUrl) => {
    const response = await fetch(audioUrl);
    if (!response.ok) {
        throw new Error(`Could not download audio for assessment: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
        base64Audio: buffer.toString('base64'),
        mimeType: getAudioMimeType(audioUrl),
        size: buffer.length
    };
};

const getReferenceText = (speaking) => {
    if (['pronunciation', 'shadowing'].includes(speaking.type)) {
        const scriptText = (speaking.scripts || [])
            .map(script => script.korean)
            .filter(Boolean)
            .join(' ');

        return scriptText || speaking.sampleAnswer || speaking.prompt || '';
    }

    return '';
};

const getExpectedContent = (speaking) => ({
    title: speaking.title,
    type: speaking.type,
    prompt: speaking.prompt,
    instruction: speaking.instruction,
    referenceText: getReferenceText(speaking),
    targetVocabularies: speaking.targetVocabularies || [],
    targetGrammar: speaking.targetGrammar || [],
    sampleAnswer: speaking.sampleAnswer,
    sampleTranslation: speaking.sampleTranslation
});

const buildGeminiAudioPrompt = ({ speaking, recordingDuration }) => {
    const expected = getExpectedContent(speaking);

    return `
You are Salio's Korean speaking assessment engine.
Assess the learner's audio against the speaking task below.
Do not invent content that is not present in the audio. If the audio is unclear, too short, off-topic, or not Korean, reduce the relevant scores.

Speaking task:
${JSON.stringify(expected, null, 2)}

Recording duration in seconds:
${recordingDuration || 0}

Return only valid JSON with this exact shape:
{
  "transcript": "Korean transcript of what the learner said. Empty string if not understandable.",
  "pronunciation": 0,
  "intonation": 0,
  "accuracy": 0,
  "fluency": 0,
  "isOnTopic": false,
  "contentCoverage": 0,
  "grammarUsage": 0,
  "vocabularyUsage": 0,
  "feedback": "Short Vietnamese feedback.",
  "suggestions": "Short Vietnamese improvement suggestion.",
  "strengths": ["Short Vietnamese strength."],
  "areasForImprovement": ["Short Vietnamese issue."],
  "recommendedExercises": ["Short Vietnamese exercise."]
}

Scoring guide:
- pronunciation: how clearly and correctly the Korean sounds are pronounced.
- intonation: rhythm, pitch movement, and naturalness.
- fluency: smoothness, pace, hesitation, and pauses.
- accuracy: relevance to the prompt, grammar correctness, vocabulary usage, and task completion.
- For pronunciation or shadowing tasks, compare against referenceText.
- For role_play, presentation, or free_talk tasks, focus accuracy on prompt adherence and target grammar/vocabulary.
- All scores must be numbers from 0 to 100.
`;
};

const calculateWeightedPercentage = ({ speaking, scores }) => {
    const criteria = speaking.scoringCriteria || {};
    const weights = {
        pronunciation: Number(criteria.pronunciation || 25),
        intonation: Number(criteria.intonation || 25),
        accuracy: Number(criteria.accuracy || 25),
        fluency: Number(criteria.fluency || 25)
    };
    const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0) || 100;

    const weightedTotal = Object.entries(weights).reduce((sum, [key, weight]) => {
        return sum + clampScore(scores[key]) * weight;
    }, 0);

    return clampScore(weightedTotal / totalWeight);
};

export const assessSpeakingSubmission = async ({ submission, speaking }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY in .env');

    const { base64Audio, mimeType, size } = await downloadAudioAsBase64(submission.audioUrl);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_SPEAKING_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    });

    const result = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [
                    { text: buildGeminiAudioPrompt({ speaking, recordingDuration: submission.recordingDuration }) },
                    {
                        inlineData: {
                            mimeType,
                            data: base64Audio
                        }
                    }
                ]
            }
        ],
        generationConfig: { responseMimeType: 'application/json' }
    });

    const geminiResult = parseJsonObject(result.response.text());
    const scores = {
        pronunciation: clampScore(geminiResult.pronunciation),
        intonation: clampScore(geminiResult.intonation),
        accuracy: clampScore(geminiResult.accuracy),
        fluency: clampScore(geminiResult.fluency)
    };
    const percentage = calculateWeightedPercentage({ speaking, scores });

    return {
        ...scores,
        percentage,
        score: percentage,
        transcript: geminiResult.transcript || '',
        feedback: geminiResult.feedback,
        suggestions: geminiResult.suggestions,
        strengths: geminiResult.strengths || [],
        areasForImprovement: geminiResult.areasForImprovement || [],
        recommendedExercises: geminiResult.recommendedExercises || [],
        provider: 'gemini-audio-speaking-assessment',
        rawResult: {
            provider: 'gemini',
            model: process.env.GEMINI_SPEAKING_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            audio: { mimeType, size },
            assessment: geminiResult
        }
    };
};
