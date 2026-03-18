import dotenv from 'dotenv';
dotenv.config();
console.log("🔍 MONGODB_URI =", process.env.MONGODB_URI);

import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js'; 

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; 
import path from 'path';
import { fileURLToPath } from 'url'; // THÊM DÒNG NÀY

import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js'
import auditLogsRoutes from './src/routes/auditLogsRoutes.js'
import contentApprovalRoutes from './src/routes/contentApprovalRoutes.js'
import newsRoutes from './src/routes/newsRoutes.js'
import cultureRoutes from './src/routes/cultureRoutes.js'
import lessonRoutes from './src/routes/lessonRoutes.js'
import teacherRoutes from './src/routes/teacherRoutes.js'
import adminLessonRoutes from './src/routes/adminLessonRoutes.js'
import paymentRoutes from './src/routes/paymentRoutes.js'
import supportRoutes from './src/routes/supportRoutes.js'
import dashboardRoutes from './src/routes/dashboardRoutes.js'
// import postRoutes from './routes/postRoutes.js';
// import reputationRoutes from './routes/reputationRoutes.js';
// import joinRequestRoutes from './routes/joinRequestRoutes.js'; // Thêm route mới

import grammarRoutes from './src/routes/grammarRoutes.js'

import listeningRoutes from './src/routes/listeningRoutes.js'
import readingRoutes from './src/routes/readingRoutes.js'
import speakingRoutes from './src/routes/speakingRoutes.js'
import vocabularyRoutes from './src/routes/vocabularyRoutes.js'
import writingRoutes from './src/routes/writingRoutes.js'

import examRoutes from './src/routes/examRoutes.js'
import lessonProgressRoutes from './src/routes/lessonProgressRoutes.js'


// Import models
import {
  User,Lesson,Vocabulary,Grammar,Reading,Listening,
  ListeningProgress,Speaking, SpeakingProgress, SpeakingSubmission ,Writing,
  WritingSubmission,WritingProgress,Culture,Question,Exam,ExamSession,
  ExamResult,FlashcardSet,Payment,SubscriptionPlan,Comment

} from './src/models/index.js';

// Cấu hình dotenv để sử dụng các biến môi trường
import NewsScheduler from './src/services/newsScheduler.js';

// Khởi tạo ứng dụng Express
const app = express();
const port = process.env.PORT || 5000;
const mongoURI = process.env.MONGODB_URI;

// Initialize news scheduler
const newsScheduler = new NewsScheduler();

app.use(cors());

// QUAN TRỌNG: Phục vụ static files từ thư mục uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
// Sử dụng express.json() để parse body của request
app.use(express.json());

// Kết nối đến MongoDB
mongoose.connect(mongoURI)
    .then(() => console.log('Đã kết nối đến MongoDB thành công!'))
    .catch(err => console.error('Lỗi kết nối MongoDB:', err));

// Route cho tài liệu API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Định tuyến API
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/content', contentApprovalRoutes)
app.use('/api/news', newsRoutes)
app.use('/api/culture', cultureRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/teacher', teacherRoutes)
app.use('/api/admin/lessons', adminLessonRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/dashboard', dashboardRoutes)

// app.use('/api/posts', postRoutes);
// app.use('/api/reputation', reputationRoutes);
// app.use('/api/join-requests', joinRequestRoutes); // Sử dụng route mới


app.use('/api/grammar', grammarRoutes)
app.use('/api/listening', listeningRoutes)
app.use('/api/readings', readingRoutes)
app.use('/api/speakings', speakingRoutes)
app.use('/api/vocabulary', vocabularyRoutes)
app.use('/api/writings', writingRoutes)
app.use('/api/lesson-progress', lessonProgressRoutes)


app.use('/api/exams', examRoutes)

// Middleware xử lý lỗi toàn cục
app.use((err, req, res, next) => {
    // Xử lý lỗi của Multer (Upload file)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
            message: 'File quá lớn! Vui lòng upload file nhỏ hơn 50MB.' 
        });
    }
    
    if (err.message === 'Chỉ chấp nhận file audio!') {
         return res.status(400).json({ 
            message: err.message
        });
    }

    console.error('Server Error:', err);
    res.status(500).json({ 
        message: 'Lỗi server nội bộ', 
        error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
});

// Khởi động server
app.listen(port, '0.0.0.0', () => {
    console.log(`\nServer đã sẵn sàng!`);
    console.log(`-------------------------------------------------------`);
    console.log(`Local:   http://localhost:${port}`);
    console.log(`Swagger: http://localhost:${port}/api-docs`);
    console.log(`-------------------------------------------------------`);
    console.log(`Mobile/LAN: http://192.168.1.9:${port}`);
    console.log(`Swagger LAN: http://192.168.1.9:${port}/api-docs`);
    console.log(`-------------------------------------------------------`);
    
    // Start news scheduler after server starts
    newsScheduler.startScheduler();
    
    // Optional: Run initial crawl on startup (disabled for now)
    // setTimeout(() => {
    //     newsScheduler.runImmediateCrawl()
    //         .then(results => console.log('Initial news crawl completed:', results))
    //         .catch(error => console.error('Initial news crawl failed:', error));
    // }, 5000); // Wait 5 seconds after server start
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Graceful shutdown...');
    newsScheduler.stopScheduler();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Graceful shutdown...');
    newsScheduler.stopScheduler();
    process.exit(0);
});

