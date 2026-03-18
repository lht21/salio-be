import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Schema cho câu hỏi
const listeningQuestionSchema = new Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }], // Mảng 4 string
    answer: { type: Number, required: true },    // Index 0-3
    explanation: { type: String, default: '' }
}, { _id: true }); // Giữ _id để frontend dùng làm key

// Schema chính
const listeningSchema = new Schema({
    title: { type: String, required: true },
    audioUrl: { type: String, required: true },
    transcript: { type: String, required: true },
    translation: { type: String, default: '' },
    
    level: {
        type: String,
        // Enum phải khớp với value trong <select> của Modal
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp 3', 'Trung cấp 4', 'Cao cấp 5', 'Cao cấp 6'],
        required: true
    },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },

    duration: { type: Number, default: 0 }, // Thời lượng (giây)
    questions: [listeningQuestionSchema],
    
    // Các trường quản lý
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', default: null }, // Optional nếu bài nghe ko thuộc lesson cụ thể
    isActive: { type: Boolean, default: true },
    
    // Thống kê (Giữ nguyên logic của bạn)
    playCount: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    
    difficulty: {
        type: String,
        enum: ['Dễ', 'Trung bình', 'Khó'],
        default: 'Trung bình'
    },
    tags: [{ type: String }]
}, { 
    timestamps: true,
    toJSON: { virtuals: true }
});

const Listening = mongoose.model('Listening', listeningSchema);

// Schema Progress (Giữ nguyên logic của bạn)
const listeningProgressSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listening: { type: Schema.Types.ObjectId, ref: 'Listening', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' }, // Có thể null
    score: { type: Number, default: 0 },
    answers: [{
        questionId: { type: Schema.Types.ObjectId },
        selectedAnswer: { type: Number },
        isCorrect: { type: Boolean }
    }],
    completed: { type: Boolean, default: false }
}, { timestamps: true });

const ListeningProgress = mongoose.model('ListeningProgress', listeningProgressSchema);

export default Listening;
export { ListeningProgress };