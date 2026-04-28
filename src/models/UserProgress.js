import mongoose from 'mongoose';
const { Schema } = mongoose;

const userProgressSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  gamification: {
    clouds: { type: Number, default: 100 }, // Thưởng 100 mây mặc định cho tài khoản mới
    currentStreak: { type: Number, default: 0 },
    highestStreak: { type: Number, default: 0 },
    activeDates: [{ type: String }], // Format: "YYYY-MM-DD"
    dailyQuest: {
      date: { type: String }, // Lưu ngày hiện tại để reset
      missions: [{
        id: String, // 'D1', 'D2'...
        progress: { type: Number, default: 0 },
        isClaimed: { type: Boolean, default: false } // Đã bấm nhận thưởng chưa
      }],
    },
    inventory: {
      streakFreezes: { type: Number, default: 0 }, // R1: Số lượng bùa bảo vệ streak
      doubleRewardEndDate: { type: Date },         // R2: Thời điểm hết hạn x2
      advancedAIAttempts: { type: Number, default: 0 }, // R3: Số lượt chấm AI nâng cao
      badges: [{ type: String }],                  // R5: Danh sách huy hiệu hiếm
      unlockedExams: [{ type: Schema.Types.ObjectId, ref: 'Exam' }] // R7: Đề thi Premium đã mua
    }
  },

  statistics: {
    savedVocabularies: [{ type: Schema.Types.ObjectId, ref: 'Vocabulary' }],
    highestMockScore: { type: Number, default: 0 },
    totalStudyTime: { type: Number, default: 0 }, // phút
    completedLessons: [{ type: Schema.Types.ObjectId, ref: 'LessonProgress' }]
  }
}, { timestamps: true });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
 
/** Tổng số từ vựng đã lưu */
userProgressSchema.virtual('statistics.savedVocabulariesCount').get(function () {
  return this.statistics?.savedVocabularies?.length ?? 0;
});
 
/** Tổng bài học đã hoàn thành */
userProgressSchema.virtual('statistics.completedLessonsCount').get(function () {
  return this.statistics?.completedLessons?.length ?? 0;
});
 
// ─── Statics ──────────────────────────────────────────────────────────────────
 
/**
 * Tạo bản ghi UserProgress mặc định khi user mới đăng ký.
 * Gọi sau khi tạo User document.
 */
userProgressSchema.statics.initForUser = async function (userId) {
  const existing = await this.findOne({ user: userId });
  if (existing) return existing;
  return this.create({ user: userId });
};
 
// ─── Instance Methods ─────────────────────────────────────────────────────────
 
/**
 * Ghi nhận ngày học hôm nay (YYYY-MM-DD) và cập nhật streak.
 * An toàn khi gọi nhiều lần trong cùng một ngày.
 */
userProgressSchema.methods.recordActiveDay = function () {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
 
  if (this.gamification.activeDates.includes(today)) return this; // đã ghi rồi
 
  this.gamification.activeDates.push(today);
 
  // Tính streak: kiểm tra ngày hôm qua có trong activeDates không
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (this.gamification.activeDates.includes(yesterday)) {
    this.gamification.currentStreak += 1;
  } else {
    this.gamification.currentStreak = 1; // reset
  }
 
  if (this.gamification.currentStreak > this.gamification.highestStreak) {
    this.gamification.highestStreak = this.gamification.currentStreak;
  }
 
  return this;
};
 
/**
 * Cập nhật tiến độ nhiệm vụ hằng ngày
 * @param {string} missionId - ID của nhiệm vụ (VD: 'D3')
 * @param {number} amount - Số lượng cộng thêm
 */
userProgressSchema.methods.updateMissionProgress = function (missionId, amount = 1) {
  const today = new Date().toISOString().slice(0, 10);
  
  // Nếu qua ngày mới -> Reset lại danh sách nhiệm vụ
  if (this.gamification.dailyQuest?.date !== today) {
    this.gamification.dailyQuest = {
      date: today,
      missions: ['D1', 'D2', 'D3', 'D4', 'D5'].map(id => ({ id, progress: 0, isClaimed: false }))
    };
  }

  const mission = this.gamification.dailyQuest.missions.find(m => m.id === missionId);
  if (mission && !mission.isClaimed) {
    mission.progress += amount;
  }
  return this;
};

/**
 * Cộng thêm clouds (reward currency).
 * @param {number} amount - số clouds cộng thêm (phải > 0)
 */
userProgressSchema.methods.addClouds = function (amount) {
  if (amount <= 0) throw new Error('Amount phải lớn hơn 0');
  
  let finalAmount = amount;
  // Kiểm tra hiệu ứng x2 mây (Double Reward)
  if (this.gamification.inventory?.doubleRewardEndDate && this.gamification.inventory.doubleRewardEndDate > new Date()) {
    finalAmount *= 2;
  }
  
  this.gamification.clouds += finalAmount;
  return this;
};
 
/**
 * Trừ clouds khi đổi thưởng.
 * @param {number} amount
 */
userProgressSchema.methods.spendClouds = function (amount) {
  if (amount <= 0) throw new Error('Amount phải lớn hơn 0');
  if (this.gamification.clouds < amount) throw new Error('Không đủ clouds');
  this.gamification.clouds -= amount;
  return this;
};
 
/**
 * Cộng thêm thời gian học (phút).
 * @param {number} minutes
 */
userProgressSchema.methods.addStudyTime = function (minutes) {
  if (minutes > 0) this.statistics.totalStudyTime += minutes;
  return this;
};
 
/**
 * Cập nhật điểm mock test cao nhất nếu điểm mới cao hơn.
 * @param {number} score
 */
userProgressSchema.methods.updateMockScore = function (score) {
  if (score > this.statistics.highestMockScore) {
    this.statistics.highestMockScore = score;
  }
  return this;
};
 
/**
 * Thêm từ vựng vào danh sách đã lưu (không trùng lặp).
 * @param {ObjectId} vocabId
 */
userProgressSchema.methods.saveVocabulary = function (vocabId) {
  const id = vocabId.toString();
  const exists = this.statistics.savedVocabularies.some((v) => v.toString() === id);
  if (!exists) this.statistics.savedVocabularies.push(vocabId);
  return this;
};
 
/**
 * Xoá từ vựng khỏi danh sách đã lưu.
 * @param {ObjectId} vocabId
 */
userProgressSchema.methods.unsaveVocabulary = function (vocabId) {
  const id = vocabId.toString();
  this.statistics.savedVocabularies = this.statistics.savedVocabularies.filter(
    (v) => v.toString() !== id
  );
  return this;
};
 
// ─── Post-save hook: keep activeDates from growing unbounded ──────────────────
// Giữ tối đa 365 ngày gần nhất
userProgressSchema.pre('save', function () {
  if (this.isModified('gamification.activeDates')) {
    const dates = [...new Set(this.gamification.activeDates)].sort();
    this.gamification.activeDates = dates.slice(-365);
  }

});

export default mongoose.model('UserProgress', userProgressSchema);