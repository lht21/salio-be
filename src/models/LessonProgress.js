import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// 1. Schema trạng thái Từ vựng (Giữ nguyên vì có logic riêng 'mastered')
const vocabularyProgressSchema = new mongoose.Schema({
  vocabularyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vocabulary' },
  status: { 
    type: String, 
    enum: ['unlearned', 'learning', 'mastered'], 
    default: 'unlearned' 
  },
  lastReviewed: { type: Date, default: Date.now }
}, { _id: false });

// 2. Schema trạng thái Bài tập chung (Reading, Listening, Writing, Speaking)
// Dùng chung schema này để code gọn gàng hơn
const exerciseStatusSchema = new Schema({
  exerciseId: { type: Schema.Types.ObjectId, required: true }, // ID của bài tập (Reading/Listening...)
  score: { type: Number, default: 0 }, // Điểm số (0-100)
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date }
}, { _id: false });

// 3. Main Schema
const lessonProgressSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },

  // --- CHI TIẾT TRẠNG THÁI (Mảng lưu lịch sử từng bài) ---
  vocabularyStatus: [vocabularyProgressSchema],
  readingStatus: [exerciseStatusSchema],   // Lưu chi tiết từng bài đọc
  listeningStatus: [exerciseStatusSchema], // Lưu chi tiết từng bài nghe
  writingStatus: [exerciseStatusSchema],   // (Dự phòng cho tương lai)
  speakingStatus: [exerciseStatusSchema],  // (Dự phòng cho tương lai)

  // --- ĐIỂM SỐ TIẾN ĐỘ (0-100) ---
  vocabularyProgress: { type: Number, default: 0 },
  grammarProgress: { type: Number, default: 0 },
  
  // Các trường dưới đây sẽ được TỰ ĐỘNG TÍNH TOÁN trong middleware
  readingProgress: { type: Number, default: 0 },
  listeningProgress: { type: Number, default: 0 },
  writingProgress: { type: Number, default: 0 },
  speakingProgress: { type: Number, default: 0 },

  // --- TỔNG QUAN ---
  overallProgress: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },

  // --- KHÓA & TRUY CẬP ---
  unlocked: { type: Boolean, default: false },
  unlockDate: { type: Date },
  lastAccessed: { type: Date, default: Date.now }
}, { timestamps: true });

// ---------------------------------------------------------
// 🧮 Middleware tự động tính toán
// ---------------------------------------------------------
lessonProgressSchema.pre('save', function (next) {
  
  // 1. Tự động tính Reading Progress (Trung bình cộng các bài đã làm)
  if (this.readingStatus && this.readingStatus.length > 0) {
    const totalScore = this.readingStatus.reduce((sum, item) => sum + item.score, 0);
    this.readingProgress = Math.round(totalScore / this.readingStatus.length);
  }

  // 2. Tự động tính Listening Progress
  if (this.listeningStatus && this.listeningStatus.length > 0) {
    const totalScore = this.listeningStatus.reduce((sum, item) => sum + item.score, 0);
    this.listeningProgress = Math.round(totalScore / this.listeningStatus.length);
  }

  // 3. Tự động tính Writing/Speaking (Nếu có logic tương tự)
  if (this.writingStatus && this.writingStatus.length > 0) {
    const totalScore = this.writingStatus.reduce((sum, item) => sum + item.score, 0);
    this.writingProgress = Math.round(totalScore / this.writingStatus.length);
  }
  
  // 4. Tính Overall Progress
  const parts = [
    this.vocabularyProgress,
    this.grammarProgress,
    this.listeningProgress,
    this.speakingProgress,
    this.readingProgress,
    this.writingProgress
  ];

  // Chỉ tính trung bình các phần có điểm (hoặc tính tất cả tùy logic của bạn)
  // Ở đây tôi giữ logic cũ: chia đều cho các phần hợp lệ
  // Tuy nhiên, logic chuẩn LMS thường chia cố định cho 6 phần. 
  // Code dưới đây chia cho số phần có giá trị khác null/undefined.
  const validParts = parts.filter(v => v !== null && v !== undefined);
  const average = validParts.length ? validParts.reduce((a, b) => a + b, 0) / validParts.length : 0;
  
  this.overallProgress = Math.round(average);
  this.isCompleted = this.overallProgress >= 100;

  next();
});

export default mongoose.model('LessonProgress', lessonProgressSchema);