// controllers/examController.js
import Exam from '../models/Exam.js'
import ExamResult from '../models/ExamResult.js'
import mongoose from 'mongoose'


///////ADMIN
const getAllExams = async (req, res) => {
    try {
        const { pageNumber, search, type, category, status } = req.query;
        const pageSize = 10;
        const page = Number(pageNumber) || 1;

        // Xây dựng bộ lọc
        const filter = {};

        if (type) filter.examType = type;
        if (category) filter.category = category;
        
        // Lọc theo trạng thái premium/free (frontend gửi 'premium' hoặc 'free')
        if (status) {
            if (status === 'premium') filter.isPremium = true;
            if (status === 'free') filter.isPremium = false;
        }

        // Tìm kiếm
        if (search) {
            filter.title = { $regex: search, $options: 'i' };
        }

        const count = await Exam.countDocuments(filter);
        const exams = await Exam.find(filter)
            .select('-questions') // Không lấy nội dung câu hỏi để nhẹ response
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            exams,
            page,
            pages: Math.ceil(count / pageSize),
            total: count
        });

    } catch (error) {
        res.status(500).json({ msg: 'Lỗi server', error: error.message });
    }
}

// Hàm trích xuất số đề từ tên đề thi
const extractExamNumber = (examName) => {
  const match = examName.match(/제(\d+)회/)
  return match ? parseInt(match[1]) : null
}

// Lấy danh sách đề thi theo loại
const getExamsByType = async (req, res) => {
    try {
        const { type } = req.query
        
        const filter = { examType: type }
        
        // Logic phân quyền:
        // - Admin: xem tất cả
        // - Teacher: chỉ xem exam của mình
        // - Student: xem tất cả exam đã approved và active
        if (req.user.role === 'teacher') {
            filter.author = req.user._id
        } else if (req.user.role === 'student') {
            filter.status = 'approved'
            filter.isActive = true
        }

        const exams = await Exam.find(filter)
            .select('-questions')
            .sort({ createdAt: -1 })

        res.json(exams)
    } catch (error) {
        console.error('❌ [getExamsByType] Lỗi:', error)
        res.status(500).json({ msg: 'Lỗi server khi lấy danh sách đề thi', error: error.message })
    }
}

// Lấy chi tiết đề thi theo số đề
const getExamById = async (req, res) => {
    try {
        const { id } = req.params // Đây bây giờ là MongoDB _id (ví dụ: 65a...)
        
        // Dùng findById trực tiếp
        const exam = await Exam.findById(id)

        if (!exam) {
            return res.status(404).json({ msg: 'Không tìm thấy đề thi' })
        }

        // Kiểm tra quyền truy cập (nếu cần thiết cho view)
        if (req.user.role !== 'admin' && !exam.author.equals(req.user._id)) {
             // Tùy logic của bạn, có thể cho xem hoặc chặn
        }

        res.json(exam)
    } catch (error) {
        console.error('❌ [getExamById] Lỗi:', error)
        res.status(500).json({ msg: 'Lỗi server', error: error.message })
    }
}


// Tạo đề thi mới
const createExam = async (req, res) => {
    try {
        console.log('🔄 [createExam] Dữ liệu nhận được:', req.body)
        console.log('🔄 [createExam] User:', req.user._id)

        const { title, examType, category, listening, reading, writing, duration, isPremium, description } = req.body

        // Validation
        if (!title || !examType || listening === undefined || reading === undefined || writing === undefined || !duration) {
            console.log('❌ [createExam] Validation failed:', { title, examType, listening, reading, writing, duration })
            return res.status(400).json({ msg: 'Vui lòng điền đầy đủ thông tin' })
        }

        const examData = {
            title,
            description,
            examType,
            category: category || 'practice',
            listening,
            reading,
            writing,
            duration,
            isPremium: isPremium || false,
            author: req.user._id,
            status: 'draft', // Mặc định là draft
            questions: { listening: [], reading: [], writing: [] }
        }

        console.log('🔄 [createExam] Dữ liệu exam:', examData)

        const exam = new Exam(examData)
        await exam.save()

        console.log('✅ [createExam] Tạo đề thi thành công:', exam._id)
        res.status(201).json(exam)
    } catch (error) {
        console.error('❌ [createExam] Lỗi chi tiết:', error)
        res.status(500).json({ 
            msg: 'Lỗi server khi tạo đề thi', 
            error: error.message,
            stack: error.stack 
        })
    }
}

// Cập nhật đề thi
const updateExam = async (req, res) => {
    try {
        const { id } = req.params
        const updateData = req.body

        const exam = await Exam.findById(id)

        if (!exam) return res.status(404).json({ msg: 'Không tìm thấy đề thi' })
        
        // Update các trường cho phép
        const allowedFields = ['title', 'description', 'examType', 'category', 'listening', 'reading', 'writing', 'duration', 'isPremium', 'isActive', 'status'];
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                exam[field] = updateData[field];
            }
        });

        await exam.save()
        res.json(exam)
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi cập nhật', error: error.message })
    }
}


// Xóa đề thi theo số đề
const deleteExam = async (req, res) => {
    try {
        const { id } = req.params
        const exam = await Exam.findById(id)

        if (!exam) return res.status(404).json({ msg: 'Không tìm thấy đề thi' })

        if (req.user.role !== 'admin' && !exam.author.equals(req.user._id)) {
            return res.status(403).json({ msg: 'Không có quyền xóa' })
        }

        await Exam.findByIdAndDelete(id)
        res.json({ msg: 'Đã xóa đề thi thành công' })
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi xóa đề', error: error.message })
    }
}

// Thêm câu hỏi theo số đề (ĐÃ SỬA LỖI VALIDATION ID)
const addQuestion = async (req, res) => {
    try {
        const { id } = req.params
        const { section, ...questionData } = req.body

        const exam = await Exam.findById(id)

        if (!exam) return res.status(404).json({ msg: 'Không tìm thấy đề thi' })
        if (req.user.role !== 'admin' && !exam.author.equals(req.user._id)) {
            return res.status(403).json({ msg: 'Không có quyền thêm câu hỏi' })
        }

        // Tạo ID số nguyên cho câu hỏi (Logic này giữ nguyên là ổn)
        const newQuestionId = exam.questions[section].length > 0 
            ? Math.max(...exam.questions[section].map(q => q.id)) + 1 
            : 1

        // Fix lỗi thiếu _id cho sub-questions
        if (questionData.questions && Array.isArray(questionData.questions)) {
            questionData.questions = questionData.questions.map(subQ => ({
                ...subQ,
                _id: subQ._id || new mongoose.Types.ObjectId()
            }));
        }

        const newQuestion = {
            id: newQuestionId,
            ...questionData
        }

        exam.questions[section].push(newQuestion)
        await exam.save()
        res.status(201).json(exam)
    } catch (error) {
        console.error('Lỗi addQuestion:', error)
        res.status(500).json({ msg: 'Lỗi thêm câu hỏi', error: error.message })
    }
}

// Cập nhật câu hỏi theo số đề
const updateQuestion = async (req, res) => {
    try {
        const { id, questionId } = req.params // id = Exam _id, questionId = id câu hỏi (số nguyên 1, 2...)
        const updateData = req.body

        console.log(`🔄 [updateQuestion] ExamID: ${id}, QuestionID: ${questionId}`)

        // 1. Kiểm tra ID MongoDB hợp lệ
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: 'ID đề thi không hợp lệ' })
        }

        // 2. Tìm đề thi bằng _id
        const exam = await Exam.findById(id)

        if (!exam) {
            return res.status(404).json({ msg: 'Không tìm thấy đề thi' })
        }

        // 3. Kiểm tra quyền
        if (req.user.role !== 'admin' && !exam.author.equals(req.user._id)) {
            return res.status(403).json({ msg: 'Không có quyền cập nhật câu hỏi' })
        }

        // 4. Tìm và cập nhật câu hỏi trong các section
        let questionFound = false
        const sections = ['listening', 'reading', 'writing']
        
        // Parse questionId từ string (URL) sang số nguyên để so sánh
        const targetQId = parseInt(questionId) 

        for (const section of sections) {
            // Tìm vị trí câu hỏi trong mảng
            const questionIndex = exam.questions[section].findIndex(q => q.id === targetQId)
            
            if (questionIndex !== -1) {
                console.log(`✅ Tìm thấy câu hỏi trong phần: ${section}`)

                // Xử lý sub-questions (câu trắc nghiệm con) để đảm bảo có _id
                if (updateData.questions && Array.isArray(updateData.questions)) {
                    updateData.questions = updateData.questions.map(subQ => ({
                        ...subQ,
                        // Giữ nguyên _id nếu có, nếu không thì tạo mới
                        _id: subQ._id || new mongoose.Types.ObjectId()
                    }));
                }

                // Cập nhật dữ liệu
                // Giữ lại id cũ, ghi đè các trường mới
                exam.questions[section][questionIndex] = {
                    ...exam.questions[section][questionIndex], // Giữ dữ liệu cũ
                    ...updateData,                             // Ghi đè dữ liệu mới
                    id: targetQId                              // Đảm bảo ID số nguyên không bị đổi
                }
                
                questionFound = true
                break
            }
        }

        if (!questionFound) {
            console.log(`❌ Không tìm thấy câu hỏi có id: ${targetQId}`)
            return res.status(404).json({ msg: 'Không tìm thấy câu hỏi cần sửa' })
        }

        await exam.save()
        console.log('✅ Cập nhật câu hỏi thành công')
        res.json(exam)

    } catch (error) {
        console.error('❌ [updateQuestion] Lỗi:', error)
        res.status(500).json({ msg: 'Lỗi server khi cập nhật câu hỏi', error: error.message })
    }
}


// Xóa câu hỏi theo số đề
// Cập nhật tham số
const deleteQuestion = async (req, res) => {
    try {
        const { id, section, questionId } = req.params // THÊM section từ URL
        
        console.log(`🔄 [deleteQuestion] Xóa câu ${questionId} từ section ${section}`)

        const exam = await Exam.findById(id)

        if (!exam) return res.status(404).json({ msg: 'Không tìm thấy đề thi' })
        if (req.user.role !== 'admin' && !exam.author.equals(req.user._id)) {
            return res.status(403).json({ msg: 'Không có quyền xóa câu hỏi' })
        }

        // Kiểm tra section hợp lệ
        const validSections = ['listening', 'reading', 'writing']
        if (!validSections.includes(section)) {
            return res.status(400).json({ msg: 'Section không hợp lệ' })
        }

        // Tìm câu hỏi trong section được chỉ định
        const questionIndex = exam.questions[section].findIndex(q => q.id === parseInt(questionId))
        
        if (questionIndex === -1) {
            return res.status(404).json({ 
                msg: `Không tìm thấy câu hỏi ${questionId} trong phần ${section}` 
            })
        }

        // Xóa câu hỏi
        exam.questions[section].splice(questionIndex, 1)
        
        console.log(`✅ Đã xóa câu hỏi ${questionId} từ section ${section}`)
        
        await exam.save()
        res.json({
            msg: 'Đã xóa câu hỏi thành công',
            exam
        })
    } catch (error) {
        console.error('❌ [deleteQuestion] Lỗi:', error)
        res.status(500).json({ msg: 'Lỗi xóa câu hỏi', error: error.message })
    }
}
// Toggle premium status theo số đề
const togglePremium = async (req, res) => {
    try {
        const { id } = req.params
        const exam = await Exam.findById(id)

        if (!exam) return res.status(404).json({ msg: 'Không tìm thấy đề thi' })
        if (req.user.role !== 'admin' && !exam.author.equals(req.user._id)) {
            return res.status(403).json({ msg: 'Không có quyền' })
        }

        exam.isPremium = !exam.isPremium
        await exam.save()
        res.json(exam)
    } catch (error) {
        res.status(500).json({ msg: 'Lỗi toggle premium', error: error.message })
    }
}

// Submit exam result với câu trả lời viết
const submitExamResult = async (req, res) => {
    try {
        const { examId, answers, writingAnswers, timeSpent, isTrialMode, sectionType } = req.body
        
        // Validate input
        if (!examId) {
            return res.status(400).json({ msg: 'Thiếu examId' })
        }
        
        // Tìm đề thi
        const exam = await Exam.findById(examId)
        if (!exam) {
            return res.status(404).json({ msg: 'Không tìm thấy đề thi' })
        }
        
        // Chuẩn bị dữ liệu writing answers
        const writingAnswersArray = []
        if (writingAnswers && Object.keys(writingAnswers).length > 0) {
            for (const [key, answer] of Object.entries(writingAnswers)) {
                const questionId = key.replace('writing-', '')
                writingAnswersArray.push({
                    questionId,
                    answer,
                    wordCount: answer.split(/\s+/).filter(w => w.length > 0).length,
                    charCount: answer.length,
                    status: 'pending' // Chờ giáo viên chấm
                })
            }
        }
        
        // Tính điểm cho câu trắc nghiệm (nếu có)
        let totalScore = 0
        let maxScore = 0
        const answerResults = []
        
        if (answers && Object.keys(answers).length > 0) {
            // Lấy câu hỏi theo section
            let questions = []
            if (sectionType === 'listening') {
                questions = exam.listening || []
            } else if (sectionType === 'reading') {
                questions = exam.reading || []
            }
            
            for (const question of questions) {
                const userAnswer = answers[question._id.toString()]
                const correctAnswer = question.correctAnswer
                const isCorrect = userAnswer === correctAnswer
                
                maxScore += question.points || 1
                if (isCorrect) {
                    totalScore += question.points || 1
                }
                
                answerResults.push({
                    section: sectionType,
                    questionId: question._id,
                    questionNumber: question.questionNumber,
                    userAnswer: userAnswer?.toString(),
                    correctAnswer: correctAnswer.toString(),
                    isCorrect,
                    points: isCorrect ? (question.points || 1) : 0
                })
            }
        }
        
        // Tạo exam result
        const examResult = new ExamResult({
            user: req.user._id,
            exam: examId,
            isTrialMode: isTrialMode || false,
            sectionType,
            totalScore,
            maxScore,
            percentage: maxScore > 0 ? (totalScore / maxScore) * 100 : 0,
            passed: maxScore > 0 ? (totalScore / maxScore) >= 0.6 : false,
            timeSpent: timeSpent || 0,
            answers: answerResults,
            writingAnswers: writingAnswersArray
        })
        
        await examResult.save()
        
        res.status(201).json({
            msg: 'Đã nộp bài thành công',
            resultId: examResult._id,
            totalScore,
            maxScore,
            percentage: examResult.percentage,
            hasWritingAnswers: writingAnswersArray.length > 0
        })
        
    } catch (error) {
        console.error('❌ [submitExamResult] Lỗi:', error)
        res.status(500).json({ msg: 'Lỗi khi nộp bài', error: error.message })
    }
}

export {
    getExamsByType,
    getExamById,
    createExam,
    updateExam,
    deleteExam,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    togglePremium,
    getAllExams,
    submitExamResult
}
