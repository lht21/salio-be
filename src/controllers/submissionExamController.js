import Exam from '../models/Exam.js'
import ExamResult from '../models/ExamResult.js'
import mongoose from 'mongoose'

// Submit writing answer cho exam
export const submitExamWriting = async (req, res) => {
  try {
    const { examId } = req.params
    const userId = req.user._id
    const { 
      content, 
      timeSpent = 0, 
      isDraft = false,
      writing // chứa thông tin writing question
    } = req.body

    console.log('🔄 [submitExamWriting] Request:', { examId, userId, writing })

    // 1. Tìm exam
    const exam = await Exam.findById(examId)
    if (!exam) {
      return res.status(404).json({ message: 'Không tìm thấy đề thi' })
    }

    // 2. Kiểm tra writing question có tồn tại trong exam không
    const writingQuestion = exam.questions.writing.find(
      q => q.id.toString() === writing?.id?.toString()
    )
    
    if (!writingQuestion) {
      return res.status(404).json({ 
        message: 'Không tìm thấy câu hỏi viết trong đề thi',
        writingId: writing?.id 
      })
    }

    // 3. Tìm hoặc tạo ExamResult cho user
    let examResult = await ExamResult.findOne({
      user: userId,
      exam: examId,
      isTrialMode: true
    })

    if (!examResult) {
      // Tạo ExamResult mới nếu chưa có
      examResult = new ExamResult({
        user: userId,
        exam: examId,
        isTrialMode: true,
        sectionType: 'writing',
        timeSpent: 0,
        answers: [],
        writingAnswers: []
      })
    }

    // 4. Tìm writing answer cho question này (nếu có)
    const existingAnswerIndex = examResult.writingAnswers.findIndex(
      wa => wa.questionId === writing.id.toString() && wa.user.toString() === userId.toString()
    )

    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length
    const charCount = content.length

    let attemptNumber = 1
    let previousAttempts = []

    // Nếu đã có bài làm trước đó
    if (existingAnswerIndex !== -1) {
      const existingAnswer = examResult.writingAnswers[existingAnswerIndex]
      
      // Lưu bài làm cũ vào previousAttempts
      previousAttempts = existingAnswer.previousAttempts || []
      previousAttempts.push({
        answer: existingAnswer.answer,
        score: existingAnswer.score,
        submittedAt: existingAnswer.submittedAt,
        evaluatedAt: existingAnswer.evaluatedAt,
        feedback: existingAnswer.feedback
      })
      
      attemptNumber = existingAnswer.attemptNumber + 1
      
      // Đánh dấu bài cũ không phải là mới nhất
      examResult.writingAnswers[existingAnswerIndex].isLatest = false
    }

    // Tạo writing answer mới
    const writingAnswer = {
      user: userId, // 👈 THÊM user vào writing answer
      questionId: writing.id.toString(),
      answer: content,
      wordCount,
      charCount,
      submittedAt: new Date(),
      status: isDraft ? 'draft' : 'pending',
      attemptNumber,
      previousAttempts,
      isLatest: true
    }

    // Thêm bài làm mới (không ghi đè)
    examResult.writingAnswers.push(writingAnswer)

    // 5. Cập nhật timeSpent
    examResult.timeSpent = (examResult.timeSpent || 0) + timeSpent

    await examResult.save()

    console.log('✅ [submitExamWriting] Đã lưu bài viết (attempt #' + attemptNumber + ')')

    res.status(200).json({
      success: true,
      message: isDraft ? 'Đã lưu nháp' : 
               attemptNumber > 1 ? 'Đã nộp bài lại thành công' : 'Đã nộp bài thành công',
      data: {
        examResultId: examResult._id,
        writingAnswer,
        wordCount,
        charCount,
        attemptNumber,
        hasPreviousAttempts: previousAttempts.length > 0
      }
    })

  } catch (error) {
    console.error('❌ [submitExamWriting] Error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi nộp bài viết',
      error: error.message 
    })
  }
}

// Lấy danh sách bài nộp writing của một exam (cho giáo viên)
export const getExamWritingSubmissions = async (req, res) => {
  try {
    const { examId } = req.params

    // Tìm tất cả ExamResult có writing answers
    const examResults = await ExamResult.find({
      exam: examId,
      'writingAnswers.0': { $exists: true } // Có ít nhất 1 writing answer
    })
    .populate('user', 'name email avatar')
    .populate('exam', 'title examType')
    .sort({ 'writingAnswers.submittedAt': -1 })

    // Transform dữ liệu
    const submissions = []
    examResults.forEach(result => {
      result.writingAnswers.forEach(writingAnswer => {
        // Tìm writing question details
        const writingQuestion = result.exam.questions?.writing?.find(
          q => q.id.toString() === writingAnswer.questionId
        )

        submissions.push({
          _id: writingAnswer._id,
          examResultId: result._id,
          user: {
            _id: result.user._id,
            name: result.user.name,
            email: result.user.email,
            avatar: result.user.avatar
          },
          exam: {
            _id: result.exam._id,
            title: result.exam.title,
            type: result.exam.examType
          },
          writingQuestion: writingQuestion || {
            id: writingAnswer.questionId,
            prompt: 'Không tìm thấy đề bài'
          },
          content: writingAnswer.answer,
          wordCount: writingAnswer.wordCount,
          charCount: writingAnswer.charCount,
          timeSpent: result.timeSpent,
          status: writingAnswer.status,
          submittedAt: writingAnswer.submittedAt,
          score: writingAnswer.score,
          feedback: writingAnswer.feedback,
          grammar: writingAnswer.grammar,      
          vocabulary: writingAnswer.vocabulary,
          structure: writingAnswer.structure,  
          rubricContent: writingAnswer.content, 
          coherence: writingAnswer.coherence,   
          corrections: writingAnswer.corrections, 
          suggestions: writingAnswer.suggestions,
          evaluatedAt: writingAnswer.evaluatedAt,
          evaluatedBy: writingAnswer.evaluatedBy
        })
      })
    })

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    })

  } catch (error) {
    console.error('❌ [getExamWritingSubmissions] Error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi lấy bài nộp',
      error: error.message 
    })
  }
}

// Lấy tất cả bài nộp writing của user cho một question
export const getUserWritingAnswers = async (req, res) => {
  try {
    const { examId, questionId } = req.params
    const userId = req.user._id

    const examResult = await ExamResult.findOne({
      user: userId,
      exam: examId
    })

    if (!examResult) {
      return res.status(200).json({
        success: true,
        data: {
          answers: [],
          totalAttempts: 0
        }
      })
    }

    // Lấy tất cả writing answers cho question này
    const answers = examResult.writingAnswers
      .filter(wa => wa.questionId === questionId)
      .sort((a, b) => b.attemptNumber - a.attemptNumber) // Sắp xếp mới nhất trước

    res.status(200).json({
      success: true,
      data: {
        answers,
        totalAttempts: answers.length,
        latestAnswer: answers.length > 0 ? answers[0] : null
      }
    })

  } catch (error) {
    console.error('❌ [getUserWritingAnswers] Error:', error)
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi lấy bài nộp',
      error: error.message 
    })
  }
}

// Chấm điểm writing submission (cũ - theo examResultId và questionId)
export const evaluateWritingSubmission = async (req, res) => {
  try {
    const { examResultId, questionId } = req.params;
    const { 
      score, feedback, grammar, vocabulary, 
      structure, content, coherence, corrections, suggestions 
    } = req.body;

    console.log('📥 [evaluateWritingSubmission] Received data:', req.body);

    // VALIDATE DỮ LIỆU
    const validateNumber = (value, fieldName) => {
      if (value === undefined || value === null) return 0;
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };

    const validatedData = {
      score: validateNumber(score, 'score'),
      grammar: validateNumber(grammar, 'grammar'),
      vocabulary: validateNumber(vocabulary, 'vocabulary'),
      structure: validateNumber(structure, 'structure'),
      content: validateNumber(content, 'content'),
      coherence: validateNumber(coherence, 'coherence'),
      feedback: feedback || '',
      corrections: corrections || '',
      suggestions: suggestions || ''
    };

    console.log('✅ [evaluateWritingSubmission] Validated data:', validatedData);

    const examResult = await ExamResult.findById(examResultId);
    if (!examResult) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy kết quả bài thi' 
      });
    }

    const writingAnswerIndex = examResult.writingAnswers.findIndex(
      wa => wa.questionId === questionId
    );

    if (writingAnswerIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy bài viết' 
      });
    }

    // Cập nhật tất cả thông tin đánh giá
    const target = examResult.writingAnswers[writingAnswerIndex];
    target.score = validatedData.score;
    target.feedback = validatedData.feedback;
    target.grammar = validatedData.grammar;
    target.vocabulary = validatedData.vocabulary;
    target.structure = validatedData.structure;
    target.content = validatedData.content;
    target.coherence = validatedData.coherence;
    target.corrections = validatedData.corrections;
    target.suggestions = validatedData.suggestions;
    
    target.evaluatedAt = new Date();
    target.evaluatedBy = req.user._id;
    target.status = 'evaluated';

    await examResult.save();

    console.log('✅ [evaluateWritingSubmission] Saved successfully');

    res.status(200).json({
      success: true,
      message: 'Đã chấm điểm thành công',
      data: target
    });
  } catch (error) {
    console.error('❌ [evaluateWritingSubmission] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi chấm điểm', 
      error: error.message 
    });
  }
}

// Chấm điểm writing answer theo ID (mới - theo writingAnswerId)
export const evaluateWritingAnswer = async (req, res) => {
  try {
    const { writingAnswerId } = req.params;
    const { 
      score, feedback, grammar, vocabulary, 
      structure, content, coherence, corrections, suggestions 
    } = req.body;

    console.log('📥 [evaluateWritingAnswer] Received data:', req.body);

    // VALIDATE DỮ LIỆU
    const validateNumber = (value, fieldName) => {
      if (value === undefined || value === null) return 0;
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };

    const validatedData = {
      score: validateNumber(score, 'score'),
      grammar: validateNumber(grammar, 'grammar'),
      vocabulary: validateNumber(vocabulary, 'vocabulary'),
      structure: validateNumber(structure, 'structure'),
      content: validateNumber(content, 'content'),
      coherence: validateNumber(coherence, 'coherence'),
      feedback: feedback || '',
      corrections: corrections || '',
      suggestions: suggestions || ''
    };

    console.log('✅ [evaluateWritingAnswer] Validated data:', validatedData);

    // Tìm ExamResult có chứa writingAnswerId
    const examResult = await ExamResult.findOne({
      'writingAnswers._id': writingAnswerId
    });

    if (!examResult) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy bài viết' 
      });
    }

    // Tìm và cập nhật writing answer cụ thể
    const writingAnswerIndex = examResult.writingAnswers.findIndex(
      wa => wa._id.toString() === writingAnswerId
    );

    if (writingAnswerIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy bài viết' 
      });
    }

    // Cập nhật tất cả thông tin đánh giá
    const target = examResult.writingAnswers[writingAnswerIndex];
    target.score = validatedData.score;
    target.feedback = validatedData.feedback;
    target.grammar = validatedData.grammar;
    target.vocabulary = validatedData.vocabulary;
    target.structure = validatedData.structure;
    target.content = validatedData.content;
    target.coherence = validatedData.coherence;
    target.corrections = validatedData.corrections;
    target.suggestions = validatedData.suggestions;
    
    target.evaluatedAt = new Date();
    target.evaluatedBy = req.user._id;
    target.status = 'evaluated';

    await examResult.save();

    console.log('✅ [evaluateWritingAnswer] Saved successfully');

    res.status(200).json({
      success: true,
      message: 'Đã chấm điểm thành công',
      data: target
    });
  } catch (error) {
    console.error('❌ [evaluateWritingAnswer] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi chấm điểm', 
      error: error.message 
    });
  }
}

// Xóa bài nộp writing
export const deleteExamWritingSubmission = async (req, res) => {
  try {
    const { examResultId, questionId } = req.params;

    // Tìm ExamResult và gỡ bỏ câu trả lời viết cụ thể
    const result = await ExamResult.findByIdAndUpdate(
      examResultId,
      { $pull: { writingAnswers: { questionId: questionId } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi kết quả' });
    }

    res.status(200).json({ success: true, message: 'Đã xóa bài nộp thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa bài nộp', error: error.message });
  }
};