import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    maxlength: 500
  },
  
  // Source information
  source: {
    type: String,
    required: true,
    enum: ['조선일보', '중앙일보', '동아일보', '한겨레', 'KBS', 'MBC', 'SBS', '연합뉴스', 'YTN']
  },
  originalUrl: {
    type: String,
    required: true,
    unique: true // Prevent duplicate articles
  },
  author: {
    type: String,
    trim: true
  },
  
  // Content metadata
  category: {
    type: String,
    required: true,
    enum: ['culture', 'food', 'technology', 'entertainment', 'sports', 'politics', 'economy', 'society']
  },
  difficulty: {
    type: String,
    default: 'intermediate',
    enum: ['beginner', 'intermediate', 'advanced']
  },
  readingTime: {
    type: Number, // in minutes
    default: 5
  },
  
  // Media
  imageUrl: {
    type: String
  },
  videoUrl: {
    type: String
  },
  
  // SEO and metadata
  keywords: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  
  // Learning features
  vocabularyWords: [{
    word: String,
    meaning: String,
    pronunciation: String,
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    }
  }],
  grammarPoints: [{
    point: String,
    explanation: String,
    examples: [String]
  }],
  
  // Engagement metrics
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  bookmarks: {
    type: Number,
    default: 0
  },
  
  // Publishing info
  publishedDate: {
    type: Date,
    required: true
  },
  lastCrawled: {
    type: Date,
    default: Date.now
  },
  
  // Status
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'archived', 'hidden']
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  
  // Analytics
  crawlSuccess: {
    type: Boolean,
    default: true
  },
  crawlErrors: [{
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for better query performance
newsSchema.index({ source: 1, publishedDate: -1 });
newsSchema.index({ category: 1, publishedDate: -1 });
newsSchema.index({ status: 1, isApproved: 1 });
newsSchema.index({ keywords: 1 });
newsSchema.index({ publishedDate: -1 });

// Virtual for formatted date
newsSchema.virtual('formattedDate').get(function() {
  return this.publishedDate.toLocaleDateString('ko-KR');
});

// Virtual for reading difficulty score
newsSchema.virtual('difficultyScore').get(function() {
  const scores = { beginner: 1, intermediate: 2, advanced: 3 };
  return scores[this.difficulty] || 2;
});

// Methods
newsSchema.methods.incrementView = function() {
  this.views += 1;
  return this.save();
};

newsSchema.methods.addBookmark = function() {
  this.bookmarks += 1;
  return this.save();
};

newsSchema.methods.removeBookmark = function() {
  this.bookmarks = Math.max(0, this.bookmarks - 1);
  return this.save();
};

// Static methods
newsSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category, 
    status: 'active', 
    isApproved: true 
  }).sort({ publishedDate: -1 });
};

newsSchema.statics.findBySource = function(source) {
  return this.find({ 
    source, 
    status: 'active', 
    isApproved: true 
  }).sort({ publishedDate: -1 });
};

newsSchema.statics.findRecent = function(limit = 20) {
  return this.find({ 
    status: 'active', 
    isApproved: true 
  })
  .sort({ publishedDate: -1 })
  .limit(limit);
};

newsSchema.statics.searchNews = function(query) {
  return this.find({
    $and: [
      { status: 'active' },
      { isApproved: true },
      {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { subtitle: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { keywords: { $in: [new RegExp(query, 'i')] } }
        ]
      }
    ]
  }).sort({ publishedDate: -1 });
};

// Pre-save middleware
newsSchema.pre('save', function(next) {
  // Calculate reading time based on content length (average 200 words per minute in Korean)
  if (this.content && this.isModified('content')) {
    const wordCount = this.content.length / 2; // Rough estimate for Korean
    this.readingTime = Math.max(1, Math.ceil(wordCount / 200));
  }
  
  // Auto-approve from trusted sources
  const trustedSources = ['KBS', 'MBC', 'SBS', '연합뉴스'];
  if (trustedSources.includes(this.source) && !this.isApproved) {
    this.isApproved = true;
    this.approvedAt = new Date();
  }
  
  next();
});

const News = mongoose.model('News', newsSchema);

export default News;
