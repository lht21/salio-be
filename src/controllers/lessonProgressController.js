import LessonProgress from '../models/LessonProgress.js';
import Lesson from '../models/Lesson.js'; // Cần import để lấy dữ liệu bài học gốc


export const initializeLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params; 
    const userId = req.user._id;

    // 1. Kiểm tra tồn tại
    let progress = await LessonProgress.findOne({
      user: userId,
      lesson: lessonId
    });

    // Kịch bản A: Đã tồn tại -> Cập nhật thời gian
    if (progress) {
      progress.lastAccessed = new Date();
      if (!progress.unlocked) {
        progress.unlocked = true;
        progress.unlockDate = new Date();
      }
      await progress.save();

      return res.status(200).json({
        success: true,
        message: 'Welcome back',
        data: progress,
        isFirstAccess: false
      });
    }

    // ---------------------------------------------------------
    // Kịch bản B: Truy cập LẦN ĐẦU -> Init toàn bộ
    // ---------------------------------------------------------
    
    // 3a. Lấy thông tin bài học gốc (Lấy hết các mảng ID bài tập)
    // Lưu ý: Đảm bảo tên trường khớp với Model Lesson của bạn
    const lessonData = await Lesson.findById(lessonId)
        .select('vocabulary reading listening speaking writing grammar'); 

    if (!lessonData) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    // 3b. Hàm helper để map ID sang Object status mặc định
    const createInitialStatus = (ids) => {
        if (!ids || ids.length === 0) return [];
        return ids.map(id => ({
            exerciseId: id,
            score: 0,
            isCompleted: false,
            // completedAt: null // Chưa hoàn thành nên chưa có ngày
        }));
    };

    // 3c. Chuẩn bị dữ liệu ban đầu
    // - Vocabulary: status 'unlearned'
    let initialVocabStatus = [];
    if (lessonData.vocabulary && lessonData.vocabulary.length > 0) {
      initialVocabStatus = lessonData.vocabulary.map((vocabId) => ({
        vocabularyId: vocabId,
        status: 'unlearned',
        lastReviewed: new Date()
      }));
    }

    // - Exercises: status mặc định (score 0)
    const initialReadingStatus = createInitialStatus(lessonData.reading);
    const initialListeningStatus = createInitialStatus(lessonData.listening);
    const initialWritingStatus = createInitialStatus(lessonData.writing);
    const initialSpeakingStatus = createInitialStatus(lessonData.speaking);
    // const initialGrammarStatus = ... (Nếu bạn muốn track grammar, nhưng thường grammar chỉ là đọc lý thuyết)

    // 3d. Tạo bản ghi tiến độ mới
    const newProgress = new LessonProgress({
      user: userId,
      lesson: lessonId,
      
      // Nạp dữ liệu khởi tạo vào
      vocabularyStatus: initialVocabStatus,
      readingStatus: initialReadingStatus,
      listeningStatus: initialListeningStatus,
      writingStatus: initialWritingStatus,
      speakingStatus: initialSpeakingStatus,

      // Các điểm số mặc định là 0
      vocabularyProgress: 0,
      readingProgress: 0,
      listeningProgress: 0,
      writingProgress: 0,
      speakingProgress: 0,
      
      unlocked: true,
      unlockDate: new Date(),
      lastAccessed: new Date(),
      isCompleted: false
    });

    // 3e. Lưu vào DB
    await newProgress.save(); 

    return res.status(201).json({
      success: true,
      message: 'Lesson initialized successfully',
      data: newProgress,
      isFirstAccess: true
    });

  } catch (error) {
    console.error('Error initializing lesson progress:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};


export const updateVocabularyStatus = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { vocabularyId, status } = req.body; // status: 'unlearned' | 'learning' | 'mastered'
    const userId = req.user._id;

    // 1. Tìm bản ghi tiến độ
    const progress = await LessonProgress.findOne({
      user: userId,
      lesson: lessonId
    });

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    // 2. Tìm vị trí của từ vựng trong mảng
    const vocabIndex = progress.vocabularyStatus.findIndex(
      (item) => item.vocabularyId.toString() === vocabularyId
    );

    if (vocabIndex === -1) {
      // Trường hợp hiếm: Từ vựng chưa có trong list (có thể do bài học mới update thêm từ)
      // Ta có thể push mới vào
      progress.vocabularyStatus.push({
        vocabularyId,
        status,
        lastReviewed: new Date()
      });
    } else {
      // Cập nhật trạng thái
      progress.vocabularyStatus[vocabIndex].status = status;
      progress.vocabularyStatus[vocabIndex].lastReviewed = new Date();
    }

    // 3. TÍNH TOÁN LẠI % TIẾN ĐỘ TỪ VỰNG (Vocabulary Progress)
    const totalVocabs = progress.vocabularyStatus.length;
    if (totalVocabs > 0) {
      // Đếm số từ đã thuộc (mastered)
      const masteredCount = progress.vocabularyStatus.filter(v => v.status === 'mastered').length;
      
      // Tính phần trăm (làm tròn)
      progress.vocabularyProgress = Math.round((masteredCount / totalVocabs) * 100);
    } else {
      progress.vocabularyProgress = 0;
    }

    // 4. Lưu lại
    // Lúc này middleware pre('save') trong Model sẽ chạy, 
    // lấy progress.vocabularyProgress mới để tính lại progress.overallProgress
    await progress.save();

    return res.status(200).json({
      success: true,
      message: 'Vocabulary status updated',
      data: {
        vocabularyId,
        newStatus: status,
        vocabularyProgress: progress.vocabularyProgress,
        overallProgress: progress.overallProgress
      }
    });

  } catch (error) {
    console.error('Error updating vocabulary:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};


// lấy chi tiết tiến độ học bài

export const getLessonProgressDetail = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user._id;

    // Tìm progress và POPULATE (nhúng) thông tin từ vựng vào
    const progress = await LessonProgress.findOne({
      user: userId,
      lesson: lessonId
    }).populate({
      path: 'vocabularyStatus.vocabularyId', // Đường dẫn tới field ref
      model: 'Vocabulary',                   // Tên Model Vocabulary
      select: 'word meaning pronunciation'   // Chỉ lấy các trường cần thiết
    });

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    return res.status(200).json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Error fetching progress detail:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};