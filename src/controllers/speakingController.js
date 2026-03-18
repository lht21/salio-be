import Speaking from '../models/Speaking.js';
import SpeakingSubmission from '../models/SpeakingSubmission.js';
import SpeakingProgress from '../models/SpeakingProgress.js';
import Lesson from '../models/Lesson.js'; // THÊM IMPORT
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

/* ============================
   MULTER UPLOAD CONFIG
============================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/speaking';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'speaking-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/')) cb(null, true);
  else cb(new Error('Chỉ chấp nhận file audio!'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

/* ============================
   UPLOAD AUDIO FILE
============================ */
export const uploadSpeakingAudio = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Không có file audio được upload' });

    const protocol = req.protocol;
    const host = req.get('host');
    const fullAudioUrl = `${protocol}://${host}/uploads/speaking/${req.file.filename}`;

    res.json({
      message: 'Upload audio speaking thành công',
      audioUrl: fullAudioUrl,
      filename: req.file.filename,
      size: req.file.size
    });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ============================
   LESSON-RELATED FUNCTIONS (GIỐNG VOCABULARY)
============================ */

// GET /api/speakings/lesson/:lessonId - Lấy speaking theo bài học
export const getSpeakingByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    console.log('🔍 [getSpeakingByLesson] Lesson ID:', lessonId);

    // 1. Validate ID
    if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lesson ID không hợp lệ' 
      });
    }

    // 2. Tìm Lesson và Populate field 'speaking'
    // Giả định trong Lesson Model bạn có field: speaking: [{ type: Schema.Types.ObjectId, ref: 'Speaking' }]
    const lesson = await Lesson.findById(lessonId).populate({
      path: 'speaking',
      populate: {
        path: 'author',
        select: 'name email'
      },
      options: { sort: { createdAt: -1 } } // Sắp xếp bài mới nhất lên đầu
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
      data: lesson.speaking || [] 
    });

  } catch (error) {
    console.error('❌ [getSpeakingByLesson] Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Lỗi server' 
    });
  }
};

// POST /api/speakings/lesson/:lessonId - Tạo speaking cho bài học
export const createSpeakingForLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const speakingData = req.body;

    console.log('📥 [createSpeakingForLesson] Received data:', speakingData);
    console.log('📥 [createSpeakingForLesson] Lesson ID:', lessonId);

    // Kiểm tra lessonId hợp lệ
    if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'Lesson ID không hợp lệ' });
    }

    // Kiểm tra lesson tồn tại
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Bài học không tồn tại' });
    }

    console.log('✅ [createSpeakingForLesson] Lesson found:', lesson.title);

    // Kiểm tra dữ liệu bắt buộc
    if (!speakingData.title || !speakingData.prompt) {
      return res.status(400).json({ 
        message: 'Tiêu đề và prompt là bắt buộc' 
      });
    }

    // Kiểm tra speaking đã tồn tại trong bài học chưa
    const existingSpeaking = await Speaking.findOne({
      title: speakingData.title,
      lesson: lessonId
    });

    if (existingSpeaking) {
      return res.status(400).json({ 
        message: 'Bài speaking đã tồn tại trong bài học này' 
      });
    }

    // Tạo speaking mới
    const speaking = new Speaking({
      title: speakingData.title.trim(),
      prompt: speakingData.prompt.trim(),
      description: speakingData.description?.trim() || '',
      level: speakingData.level || lesson.level || 'Sơ cấp 1',
      type: speakingData.type || 'question',
      duration: speakingData.duration || 60,
      tags: speakingData.tags || [],
      hints: speakingData.hints || [],
      sampleAnswer: speakingData.sampleAnswer || '',
      audioUrl: speakingData.audioUrl || '',
      author: req.userId,
      lesson: lessonId
    });

    console.log('💾 [createSpeakingForLesson] Saving speaking...');

    const savedSpeaking = await speaking.save();
    console.log('✅ [createSpeakingForLesson] Speaking saved:', savedSpeaking._id);

    // Thêm reference vào lesson
    if (!lesson.speaking) {
      lesson.speaking = [];
    }
    lesson.speaking.push(savedSpeaking._id);
    
    await lesson.save();
    console.log('✅ [createSpeakingForLesson] Lesson updated');

    // Populate để trả về đầy đủ thông tin
    await savedSpeaking.populate('lesson', 'title code level');
    await savedSpeaking.populate('author', 'name email');

    res.status(201).json(savedSpeaking);

  } catch (error) {
    console.error('❌ [createSpeakingForLesson] Error:', error);
    res.status(400).json({ 
      message: error.message || 'Có lỗi xảy ra khi tạo bài speaking' 
    });
  }
};

/* ============================
   BASIC CRUD FUNCTIONS (GIỮ NGUYÊN)
============================ */

// GET /api/speakings - Lấy danh sách bài nói
export const getSpeakings = async (req, res) => {
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

    const speakings = await Speaking.find(query)
      .populate('lesson', 'title code level')
      .populate('author', 'name email')
      .sort({ level: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Speaking.countDocuments(query);

    res.json({
      speakings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/speakings/:id - Lấy chi tiết bài nói
export const getSpeakingById = async (req, res) => {
  try {
    const speaking = await Speaking.findById(req.params.id)
      .populate('lesson', 'title code level')
      .populate('author', 'name email');

    if (!speaking) {
      return res.status(404).json({ message: 'Bài nói không tồn tại' });
    }

    res.json(speaking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/speakings - Tạo bài nói mới (có thể có hoặc không có lesson)
export const createSpeaking = async (req, res) => {
  try {
    const speaking = new Speaking({
      ...req.body,
      author: req.userId
    });

    const savedSpeaking = await speaking.save();
    
    // Nếu có lesson, thêm reference vào lesson
    if (req.body.lesson) {
      await Lesson.findByIdAndUpdate(
        req.body.lesson,
        { $addToSet: { speaking: savedSpeaking._id } }
      );
    }
    
    await savedSpeaking.populate('lesson', 'title code level');
    await savedSpeaking.populate('author', 'name email');
    
    res.status(201).json(savedSpeaking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/speakings/:id - Cập nhật bài nói
export const updateSpeaking = async (req, res) => {
  try {
    const speaking = await Speaking.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('lesson', 'title code level')
      .populate('author', 'name email');

    if (!speaking) {
      return res.status(404).json({ message: 'Bài nói không tồn tại' });
    }

    res.json(speaking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/speakings/:id - XÓA HẲN bài nói
export const deleteSpeaking = async (req, res) => {
  try {
    const speaking = await Speaking.findByIdAndDelete(req.params.id);

    if (!speaking) {
      return res.status(404).json({ message: 'Bài nói không tồn tại' });
    }

    // Xóa reference trong lesson nếu có
    if (speaking.lesson) {
      await Lesson.findByIdAndUpdate(
        speaking.lesson,
        { $pull: { speaking: req.params.id } }
      );
    }

    // XÓA LUÔN tất cả submissions và progress liên quan
    await SpeakingSubmission.deleteMany({ speaking: req.params.id });
    await SpeakingProgress.deleteMany({ speaking: req.params.id });

    res.json({ 
      message: 'Đã xóa bài nói thành công',
      deletedSpeaking: speaking 
    });

  } catch (error) {
    console.error('❌ Lỗi khi xóa bài nói:', error);
    res.status(500).json({ message: error.message });
  }
};

/* ============================
   SUBMISSION FUNCTIONS (GIỮ NGUYÊN)
============================ */

// POST /api/speakings/:id/submit - Nộp bài nói
// POST /api/speakings/:id/submit - Nộp bài nói
export const submitSpeaking = async (req, res) => {
  try {
    const { audioUrl, recordingDuration, wordCount, fileSize, lessonId } = req.body;
    
    if (!audioUrl || !recordingDuration) {
      return res.status(400).json({ 
        message: 'Thiếu dữ liệu bắt buộc: audioUrl và recordingDuration' 
      });
    }

    // Lấy thông tin speaking để lấy lessonId nếu không có trong request
    const speaking = await Speaking.findById(req.params.id);
    if (!speaking) {
      return res.status(404).json({ message: 'Bài nói không tồn tại' });
    }

    const submission = new SpeakingSubmission({
      student: req.userId,
      speaking: req.params.id,
      lesson: lessonId || speaking.lesson, // Lưu lessonId
      audioUrl,
      recordingDuration,
      wordCount: wordCount || 0,
      fileSize: fileSize || 0,
      status: 'submitted'
    });

    const savedSubmission = await submission.save();
    
    // Update speaking progress
    await updateSpeakingProgress(req.userId, req.params.id, savedSubmission);
    
    res.status(201).json(savedSubmission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/speakings/submissions - Lấy danh sách bài nộp (cho giáo viên)
export const getSubmissions = async (req, res) => {
  try {
    const { status, level, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    
    const submissions = await SpeakingSubmission.find(query)
      .populate('student', 'name email avatar level')
      .populate('speaking', 'title prompt level type')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SpeakingSubmission.countDocuments(query);

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

// PUT /api/speakings/submissions/:id/evaluate - Chấm điểm bài nói
export const evaluateSubmission = async (req, res) => {
  try {
    const { pronunciation, fluency, vocabulary, grammar, content, feedback, suggestions } = req.body;
    
    const submission = await SpeakingSubmission.findByIdAndUpdate(
      req.params.id,
      {
        status: 'evaluated',
        evaluation: {
          pronunciation,
          fluency,
          vocabulary,
          grammar,
          content,
          feedback,
          suggestions,
          evaluatedBy: req.userId,
          evaluatedAt: new Date()
        }
      },
      { new: true }
    ).populate('student', 'name email')
     .populate('speaking', 'title level');

    if (!submission) {
      return res.status(404).json({ message: 'Bài nộp không tồn tại' });
    }

    res.json(submission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/speakings/submissions/:id - XÓA HẲN bài nộp
export const deleteSubmission = async (req, res) => {
  try {
    const submission = await SpeakingSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Bài nộp không tồn tại' });
    }

    // Xóa file audio nếu tồn tại
    if (submission.audioUrl) {
      const filename = submission.audioUrl.split('/').pop();
      const audioPath = path.join(process.cwd(), 'uploads', 'speaking', filename);
      
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
        console.log('✅ Đã xóa file audio speaking:', filename);
      }
    }

    // XÓA HẲN khỏi database
    await SpeakingSubmission.findByIdAndDelete(req.params.id);

    // Cập nhật progress
    await SpeakingProgress.findOneAndUpdate(
      { user: submission.student, speaking: submission.speaking },
      { $inc: { attempts: -1 } }
    );

    res.json({ 
      message: 'Đã xóa bài nộp speaking thành công',
      deletedSubmission: submission 
    });

  } catch (error) {
    console.error('❌ Lỗi khi xóa bài nộp speaking:', error);
    res.status(500).json({ message: error.message });
  }
};

// Helper function to update speaking progress
const updateSpeakingProgress = async (userId, speakingId, submission) => {
  try {
    let progress = await SpeakingProgress.findOne({ user: userId, speaking: speakingId });
    
    if (!progress) {
      progress = new SpeakingProgress({
        user: userId,
        speaking: speakingId,
        attempts: 1,
        lastAttempt: {
          score: submission.evaluation?.score || 0,
          recordingUrl: submission.audioUrl,
          submittedAt: submission.submittedAt,
          evaluation: submission.evaluation
        }
      });
    } else {
      progress.attempts += 1;
      progress.lastAttempt = {
        score: submission.evaluation?.score || 0,
        recordingUrl: submission.audioUrl,
        submittedAt: submission.submittedAt,
        evaluation: submission.evaluation
      };
      
      // Update best score
      if (submission.evaluation?.score > progress.bestScore) {
        progress.bestScore = submission.evaluation.score;
      }
    }
    
    await progress.save();
  } catch (error) {
    console.error('Error updating speaking progress:', error);
  }
};

// GET /api/speakings/submissions/lesson/:lessonId - Lấy bài nộp theo lesson
export const getSubmissionsByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    console.log('🔍 [getSubmissionsByLesson] Lesson ID:', lessonId);

    // Validate Lesson ID
    if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ message: 'Lesson ID không hợp lệ' });
    }

    // Kiểm tra lesson tồn tại
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Bài học không tồn tại' });
    }

    // Xây dựng query
    let query = {};
    
    // Cách 1: Lọc theo speaking có lessonId (nếu speaking model có field lesson)
    const speakings = await Speaking.find({ lesson: lessonId }).select('_id');
    const speakingIds = speakings.map(s => s._id);
    
    if (speakingIds.length > 0) {
      query.speaking = { $in: speakingIds };
    } else {
      // Nếu không có speaking nào trong lesson, trả về mảng rỗng
      return res.json({
        submissions: [],
        totalPages: 0,
        currentPage: page,
        total: 0
      });
    }

    // Lọc theo status nếu có
    if (status) {
      query.status = status;
    }

    const skipValue = (page - 1) * limit;

    const submissions = await SpeakingSubmission.find(query)
      .populate('student', 'name email avatar level')
      .populate('speaking', 'title prompt level type lesson')
      .populate('speaking.lesson', 'title code')
      .sort({ submittedAt: -1 })
      .limit(limit)
      .skip(skipValue)
      .lean();

    const total = await SpeakingSubmission.countDocuments(query);

    res.json({
      submissions: submissions || [],
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ [getSubmissionsByLesson] Error:', error);
    res.status(500).json({ 
      message: error.message || 'Lỗi server khi tải bài nộp theo lesson' 
    });
  }
};
