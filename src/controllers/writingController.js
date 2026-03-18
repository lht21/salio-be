import Writing from '../models/Writing.js';
import WritingSubmission from '../models/WritingSubmission.js';
import WritingProgress from '../models/WritingProgress.js';
import Lesson from '../models/Lesson.js'; // THÊM IMPORT
import mongoose from 'mongoose';

// ============================
// LESSON-RELATED FUNCTIONS (GIỐNG VOCABULARY & SPEAKING)
// ============================



// GET /api/writings/lesson/:lessonId
export const getWritingsByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    console.log('🔍 [getWritingsByLesson] Lesson ID:', lessonId);

    // 1. Validate ID
    if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lesson ID không hợp lệ' 
      });
    }

    // 2. Tìm Lesson và Populate field 'writing'
    // Lưu ý: Field trong model Lesson là 'writing' (mảng các ID)
    const lesson = await Lesson.findById(lessonId).populate({
      path: 'writing',
      // Có thể populate thêm thông tin tác giả bài viết nếu cần hiển thị
      populate: {
        path: 'author',
        select: 'name email'
      },
      // Sắp xếp bài viết (nếu cần, ví dụ bài mới nhất lên đầu hoặc theo thứ tự)
      options: { sort: { createdAt: -1 } } 
    });

    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bài học không tồn tại' 
      });
    }

    // 3. Trả về kết quả
    return res.status(200).json({
      success: true,
      writings: lesson.writing || [] 
    });

  } catch (error) {
    console.error('❌ [getWritingsByLesson] Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Lỗi server' 
    });
  }
};

// POST /api/writings/lesson/:lessonId - Tạo writing cho bài học
// POST /api/writings/lesson/:lessonId - Tạo writing cho bài học
export const createWritingForLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const writingData = req.body;

    console.log('📥 [createWritingForLesson] Received data:', writingData);
    console.log('📥 [createWritingForLesson] Lesson ID:', lessonId);

    // Kiểm tra lessonId hợp lệ
    if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'Lesson ID không hợp lệ' });
    }

    // Kiểm tra lesson tồn tại - CHỈ SELECT CÁC TRƯỜNG CẦN THIẾT
    const lesson = await Lesson.findById(lessonId).select('title level');
    if (!lesson) {
      return res.status(404).json({ message: 'Bài học không tồn tại' });
    }

    console.log('✅ [createWritingForLesson] Lesson found:', lesson.title);

    // Kiểm tra dữ liệu bắt buộc
    if (!writingData.title || !writingData.prompt) {
      return res.status(400).json({ 
        message: 'Tiêu đề và prompt là bắt buộc' 
      });
    }

    // Kiểm tra writing đã tồn tại trong bài học chưa
    const existingWriting = await Writing.findOne({
      title: writingData.title,
      lesson: lessonId
    });

    if (existingWriting) {
      return res.status(400).json({ 
        message: 'Bài writing đã tồn tại trong bài học này' 
      });
    }

    // Tạo writing mới
    const writing = new Writing({
      title: writingData.title.trim(),
      prompt: writingData.prompt.trim(),
      description: writingData.description?.trim() || '',
      instruction: writingData.instruction?.trim() || '',
      level: writingData.level || lesson.level || 'Sơ cấp 1',
      type: writingData.type || 'paragraph',
      minWords: writingData.minWords || 50,
      maxWords: writingData.maxWords,
      wordHint: writingData.wordHint || [],
      grammarHint: writingData.grammarHint || [],
      structureHint: writingData.structureHint || '',
      sampleAnswer: writingData.sampleAnswer || '',
      sampleTranslation: writingData.sampleTranslation || '',
      tags: writingData.tags || [],
      estimatedTime: writingData.estimatedTime || 30,
      difficulty: writingData.difficulty || 'Trung bình',
      author: req.userId,
      lesson: lessonId,
      // Các trường thống kê với giá trị mặc định
      attemptCount: 0,
      averageScore: 0,
      completionRate: 0,
      averageWordCount: 0,
      isActive: true,
      isPublic: false,
    });

    console.log('💾 [createWritingForLesson] Saving writing...');

    const savedWriting = await writing.save();
    console.log('✅ [createWritingForLesson] Writing saved:', savedWriting._id);

    // THÊM REFERENCE VÀO LESSON - SỬ DỤNG findByIdAndUpdate THAY VÌ save()
    try {
      // Sử dụng $addToSet để tránh duplicate - KHÔNG GỌI save()
      await Lesson.findByIdAndUpdate(
        lessonId,
        { $addToSet: { writing: savedWriting._id } },
        { new: true, runValidators: false } // QUAN TRỌNG: runValidators: false
      );
      console.log('✅ [createWritingForLesson] Lesson updated with writing reference');
    } catch (updateError) {
      console.error('⚠️ [createWritingForLesson] Error updating lesson:', updateError);
      // KHÔNG throw error ở đây, vì writing đã được tạo thành công
      // Chỉ log warning
    }

    // Populate để trả về đầy đủ thông tin
    await savedWriting.populate('lesson', 'title code level');
    await savedWriting.populate('author', 'name email');

    res.status(201).json(savedWriting);

  } catch (error) {
    console.error('❌ [createWritingForLesson] Error:', error);
    
    // Xử lý lỗi validation
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        message: `Lỗi dữ liệu: ${messages.join(', ')}` 
      });
    }
    
    // Xử lý lỗi duplicate key
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Bài writing đã tồn tại với tiêu đề này' 
      });
    }
    
    res.status(400).json({ 
      message: error.message || 'Có lỗi xảy ra khi tạo bài writing' 
    });
  }
};

// ============================
// BASIC CRUD FUNCTIONS
// ============================

// GET /api/writings - Lấy danh sách bài viết
export const getWritings = async (req, res) => {
  try {
    const { level, type, lesson, search, page = 1, limit = 10 } = req.query;
    
    let query = { isActive: true };
    
    if (level) query.level = level;
    if (type) query.type = type;
    if (lesson) query.lesson = lesson;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { prompt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const writings = await Writing.find(query)
      .populate('lesson', 'title code level')
      .populate('author', 'name email')
      .sort({ level: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Writing.countDocuments(query);

    res.json({
      writings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/writings/:id - Lấy chi tiết bài viết
export const getWritingById = async (req, res) => {
  try {
    const writing = await Writing.findById(req.params.id)
      .populate('lesson', 'title code level')
      .populate('author', 'name email');

    if (!writing) {
      return res.status(404).json({ message: 'Bài viết không tồn tại' });
    }

    res.json(writing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/writings - Tạo bài viết mới (có thể có hoặc không có lesson)
export const createWriting = async (req, res) => {
  try {
    const writing = new Writing({
      ...req.body,
      author: req.userId
    });

    const savedWriting = await writing.save();
    
    // Nếu có lesson, thêm reference vào lesson
    if (req.body.lesson) {
      await Lesson.findByIdAndUpdate(
        req.body.lesson,
        { $addToSet: { writings: savedWriting._id } }
      );
    }
    
    await savedWriting.populate('lesson', 'title code level');
    await savedWriting.populate('author', 'name email');
    
    res.status(201).json(savedWriting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/writings/:id - Cập nhật bài viết
export const updateWriting = async (req, res) => {
  try {
    const writing = await Writing.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('lesson', 'title code level')
      .populate('author', 'name email');

    if (!writing) {
      return res.status(404).json({ message: 'Bài viết không tồn tại' });
    }

    res.json(writing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/writings/:id - XÓA HẲN bài viết
export const deleteWriting = async (req, res) => {
  try {
    const writing = await Writing.findByIdAndDelete(req.params.id);

    if (!writing) {
      return res.status(404).json({ message: 'Bài viết không tồn tại' });
    }

    // Xóa reference trong lesson nếu có
    if (writing.lesson) {
      await Lesson.findByIdAndUpdate(
        writing.lesson,
        { $pull: { writing: req.params.id } }
      );
    }

    // XÓA LUÔN tất cả submissions và progress liên quan
    await WritingSubmission.deleteMany({ writing: req.params.id });
    await WritingProgress.deleteMany({ writing: req.params.id });

    res.json({ 
      message: 'Đã xóa bài viết thành công',
      deletedWriting: writing 
    });

  } catch (error) {
    console.error('❌ Lỗi khi xóa bài viết:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================
// SUBMISSION FUNCTIONS
// ============================

// POST /api/writings/:id/submit - Nộp bài viết
export const submitWriting = async (req, res) => {
  try {
    // Destructure lessonId từ body
    const { content, timeSpent, isDraft = false, lessonId } = req.body;
    const writingId = req.params.id;
    
    // 1. Validate Writing
    const writing = await Writing.findById(writingId);
    if (!writing) {
      return res.status(404).json({ message: 'Bài viết không tồn tại' });
    }

    // 2. Validate User
    if (!req.userId) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    // 3. Xử lý logic Lesson ID
    // Ưu tiên lessonId từ body (client gửi lên), nếu không có thì lấy mặc định của bài writing
    // Nếu writing.lesson là object (do populate) thì lấy ._id, nếu là string thì lấy trực tiếp
    let finalLessonId = null;
    
    if (lessonId) {
        finalLessonId = lessonId;
    } else if (writing.lesson) {
        finalLessonId = writing.lesson._id || writing.lesson;
    }

    // 4. Tính toán
    const currentWordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const currentCharCount = content.length;

    // 5. Tạo Submission
    const submission = new WritingSubmission({
      user: req.userId,
      writing: writingId,
      content,
      lesson: finalLessonId, // ID đã xử lý ở bước 3
      wordCount: currentWordCount,
      charCount: currentCharCount,
      timeSpent: timeSpent || 0,
      isDraft,
      status: isDraft ? 'draft' : 'submitted',
      submittedAt: new Date()
    });

    const savedSubmission = await submission.save();
    
    // 6. Populate để trả về FE
    await savedSubmission.populate('user', 'name email level');
    await savedSubmission.populate('writing', 'title prompt level type minWords');
    // Chỉ populate lesson nếu có ID
    if (savedSubmission.lesson) {
        await savedSubmission.populate('lesson', 'title code');
    }
    
    // 7. Update progress
    if (!isDraft) {
      await updateWritingProgress(req.userId, writingId, savedSubmission);
    }
    
    res.status(201).json(savedSubmission);

  } catch (error) {
    console.error('❌ [Backend] submitWriting Error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: `Lỗi dữ liệu: ${messages.join(', ')}` });
    }
    res.status(500).json({ message: error.message || 'Lỗi Server' });
  }
};

// GET /api/writings/submissions - Lấy danh sách bài nộp (cho giáo viên)
export const getSubmissions = async (req, res) => {
  try {
    const { status, level, page = 1, limit = 10 } = req.query;
    
    let query = { isDraft: false }; // Chỉ hiển thị bài đã submit
    if (status) query.status = status;
    
    const submissions = await WritingSubmission.find(query)
      .populate('user', 'name email avatar level')
      .populate('writing', 'title prompt level type minWords')
      .populate('lesson', 'title code')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WritingSubmission.countDocuments(query);

    res.json({
      submissions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/writings/submissions/:id/evaluate - Chấm điểm bài viết
export const evaluateSubmission = async (req, res) => {
  try {
    const { grammar, vocabulary, structure, content, coherence, feedback, corrections, suggestions } = req.body;
    
    const submission = await WritingSubmission.findByIdAndUpdate(
      req.params.id,
      {
        status: 'evaluated',
        evaluation: {
          grammar,
          vocabulary,
          structure,
          content,
          coherence,
          feedback,
          corrections,
          suggestions,
          evaluatedBy: req.userId,
          evaluatedAt: new Date()
        }
      },
      { new: true }
    ).populate('user', 'name email')
     .populate('writing', 'title level');

    if (!submission) {
      return res.status(404).json({ message: 'Bài nộp không tồn tại' });
    }

    res.json(submission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/writings/submissions/:id - XÓA HẲN bài nộp
export const deleteSubmission = async (req, res) => {
  try {
    const submission = await WritingSubmission.findByIdAndDelete(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Bài nộp không tồn tại' });
    }

    res.json({ 
      message: 'Đã xóa bài nộp thành công',
      deletedSubmission: submission 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================
// HELPER FUNCTIONS
// ============================

// Helper function to update writing progress
const updateWritingProgress = async (userId, writingId, submission) => {
  try {
    let progress = await WritingProgress.findOne({ user: userId, writing: writingId });
    
    if (!progress) {
      progress = new WritingProgress({
        user: userId,
        writing: writingId,
        attempts: 1,
        lastAttempt: {
          score: submission.evaluation?.score || 0,
          wordCount: submission.wordCount,
          timeSpent: submission.timeSpent,
          submittedAt: submission.submittedAt,
          evaluation: submission.evaluation
        },
        averageWordCount: submission.wordCount,
        averageTimeSpent: submission.timeSpent
      });
    } else {
      progress.attempts += 1;
      progress.lastAttempt = {
        score: submission.evaluation?.score || 0,
        wordCount: submission.wordCount,
        timeSpent: submission.timeSpent,
        submittedAt: submission.submittedAt,
        evaluation: submission.evaluation
      };
      
      // Update averages
      progress.averageWordCount = Math.round(
        ((progress.averageWordCount * (progress.attempts - 1)) + submission.wordCount) / progress.attempts
      );
      progress.averageTimeSpent = Math.round(
        ((progress.averageTimeSpent * (progress.attempts - 1)) + submission.timeSpent) / progress.attempts
      );
      
      // Update best score
      if (submission.evaluation?.score > progress.bestScore) {
        progress.bestScore = submission.evaluation.score;
      }
      
      // Update word count trend (keep last 5 attempts)
      progress.wordCountTrend.push({
        attempt: progress.attempts,
        wordCount: submission.wordCount,
        submittedAt: submission.submittedAt
      });
      
      if (progress.wordCountTrend.length > 5) {
        progress.wordCountTrend = progress.wordCountTrend.slice(-5);
      }
    }
    
    await progress.save();
  } catch (error) {
    console.error('Error updating writing progress:', error);
  }
};

// GET /api/writings/submissions/lesson/:lessonId - Lấy danh sách bài nộp theo bài học
export const getSubmissionsByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate lessonId
    if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'Lesson ID không hợp lệ' });
    }

    // Kiểm tra bài học tồn tại
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Bài học không tồn tại' });
    }

    const skipValue = (page - 1) * limit;

    const submissions = await WritingSubmission.find({ lesson: lessonId })
      .populate('user', 'name email avatar level')
      .populate('writing', 'title prompt level type minWords')
      .populate('lesson', 'title code')
      .sort({ submittedAt: -1 })
      .limit(limit)
      .skip(skipValue)
      .lean();

    const total = await WritingSubmission.countDocuments({ lesson: lessonId });

    res.json({
      submissions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ [submissionService] getSubmissionsByLesson Error:', error);
    res.status(500).json({ message: error.message || 'Lỗi server khi tải submissions' });
  }
};
