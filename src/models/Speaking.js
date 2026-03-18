import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// 1. Định nghĩa Schema bài tập nói (Speaking Exercise)
const speakingSchema = new Schema({
    // Basic information
    title: { type: String, required: true },
    type: {
        type: String,
        enum: ['self_introduction', 'description', 'conversation', 'free_topic', 'role_play', 'pronunciation'],
        required: true
    },
    prompt: { type: String, required: true },
    instruction: { type: String },
    
    // Timing and limits
    duration: { type: Number, default: 60 },
    recordingLimit: { type: Number, default: 30 },
    
    // Level and difficulty
    level: {
        type: String,
        enum: ['Sơ cấp 1', 'Sơ cấp 2', 'Trung cấp', 'Cao cấp'],
        required: true
    },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', default: null },

    // Content support
    targetSentence: { type: String },
    wordHint: [{ type: String }],
    pronunciationHint: [{ type: String }],
    
    // Sample content
    sampleAnswer: { type: String },
    sampleTranslation: { type: String },
    
    // Metadata
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    
    // Statistics
    attemptCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }

}, { 
    timestamps: true,
    toJSON: { virtuals: true }
});

// Virtual for estimated completion time
speakingSchema.virtual('estimatedCompletionTime').get(function() {
    return this.duration + this.recordingLimit;
});

// Indexes
speakingSchema.index({ level: 1 });
speakingSchema.index({ type: 1 });
speakingSchema.index({ title: 'text', prompt: 'text' });
speakingSchema.index({ author: 1 });
speakingSchema.index({ tags: 1 });

// 2. Định nghĩa Schema tiến độ (Speaking Progress) - BẠN BỊ THIẾU PHẦN NÀY
const speakingProgressSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    exercise: { type: Schema.Types.ObjectId, ref: 'SpeakingExercise', required: true },
    bestScore: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    attempts: [{ 
        score: Number, 
        recordingUrl: String, 
        createdAt: { type: Date, default: Date.now } 
    }]
}, { timestamps: true });

// Middleware cho Progress
speakingProgressSchema.pre('save', function (next) {
  if (this.bestScore >= 80) this.completed = true;
  next();
});

// 3. Tạo Models
// // Sửa lỗi: dùng biến 'speakingSchema' đã định nghĩa ở trên
// const SpeakingExercise = mongoose.model('SpeakingExercise', speakingSchema);

// // Tạo Alias (Tùy chọn, nhưng nên dùng thống nhất một tên)
// const Speaking = SpeakingExercise;

// // Tạo Model Progress
// const SpeakingProgress = mongoose.model('SpeakingProgress', speakingProgressSchema);

// // 3. Export từng model riêng biệt
// export { SpeakingExercise };
// export { Speaking };
// export { SpeakingProgress };

// // 4. Export default
// export default SpeakingExercise;
export default mongoose.model('Speaking', speakingSchema);
