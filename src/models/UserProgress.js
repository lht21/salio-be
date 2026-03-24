const userProgressSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  gamification: {
    clouds: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    highestStreak: { type: Number, default: 0 },
    activeDates: [{ type: String }] // Format: "YYYY-MM-DD"
  },

  statistics: {
    savedVocabularies: [{ type: Schema.Types.ObjectId, ref: 'Vocabulary' }],
    highestMockScore: { type: Number, default: 0 },
    totalStudyTime: { type: Number, default: 0 }, // phút
    completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }]
  }
}, { timestamps: true });

// Logic tự động tính toán Streak
userProgressSchema.methods.recordActivity = async function() {
  const today = new Date().toISOString().split('T')[0];
  if (this.gamification.activeDates.includes(today)) return;

  this.gamification.activeDates.push(today);
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (this.gamification.activeDates.includes(yesterday)) {
    this.gamification.currentStreak += 1;
    if (this.gamification.currentStreak > this.gamification.highestStreak) {
      this.gamification.highestStreak = this.gamification.currentStreak;
    }
  } else {
    this.gamification.currentStreak = 1;
  }
  return await this.save();
};

export default mongoose.model('UserProgress', userProgressSchema);