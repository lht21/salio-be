import dotenv from 'dotenv';
dotenv.config();
console.log("MONGODB_URI =", process.env.MONGODB_URI);

import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; 
import path from 'path';
import { fileURLToPath } from 'url'; // THÊM DÒNG NÀY

import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
// import auditLogsRoutes from './src/routes/auditLogsRoutes.js'
// import contentApprovalRoutes from './src/routes/contentApprovalRoutes.js'
// import newsRoutes from './src/routes/newsRoutes.js'
// import cultureRoutes from './src/routes/cultureRoutes.js'
// import lessonRoutes from './src/routes/lessonRoutes.js'
// import teacherRoutes from './src/routes/teacherRoutes.js'
// import adminLessonRoutes from './src/routes/adminLessonRoutes.js'
// import paymentRoutes from './src/routes/paymentRoutes.js'
// import supportRoutes from './src/routes/supportRoutes.js'
// import dashboardRoutes from './src/routes/dashboardRoutes.js'
// import postRoutes from './routes/postRoutes.js';
// import reputationRoutes from './routes/reputationRoutes.js';
// import joinRequestRoutes from './routes/joinRequestRoutes.js'; // Thêm route mới

// import grammarRoutes from './src/routes/grammarRoutes.js'

// import listeningRoutes from './src/routes/listeningRoutes.js'
// import readingRoutes from './src/routes/readingRoutes.js'
// import speakingRoutes from './src/routes/speakingRoutes.js'
// import vocabularyRoutes from './src/routes/vocabularyRoutes.js'
// import writingRoutes from './src/routes/writingRoutes.js'

// import examRoutes from './src/routes/examRoutes.js'
// import lessonProgressRoutes from './src/routes/lessonProgressRoutes.js'


// Cấu hình dotenv để sử dụng các biến môi trường
// import NewsScheduler from './src/services/newsScheduler.js';

const app = express();
const port = process.env.PORT || 5000;
const mongoURI = process.env.MONGODB_URI;

app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

mongoose.connect(mongoURI)
    .then(() => console.log('Đã kết nối đến MongoDB thành công!'))
    .catch(err => console.error('Lỗi kết nối MongoDB:', err));

app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customSiteTitle: 'Salio API Docs',
    })
);

app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Định tuyến API
app.use('/api/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
// app.use('/api/audit-logs', auditLogsRoutes);
// app.use('/api/content', contentApprovalRoutes)
// app.use('/api/news', newsRoutes)
// app.use('/api/culture', cultureRoutes)
// app.use('/api/lessons', lessonRoutes)
// app.use('/api/teacher', teacherRoutes)
// app.use('/api/admin/lessons', adminLessonRoutes)
// app.use('/api/payment', paymentRoutes)
// app.use('/api/support', supportRoutes)
// app.use('/api/dashboard', dashboardRoutes)

// app.use('/api/posts', postRoutes);
// app.use('/api/reputation', reputationRoutes);
// app.use('/api/join-requests', joinRequestRoutes); // Sử dụng route mới


// app.use('/api/grammar', grammarRoutes)
// app.use('/api/listening', listeningRoutes)
// app.use('/api/readings', readingRoutes)
// app.use('/api/speakings', speakingRoutes)
// app.use('/api/vocabulary', vocabularyRoutes)
// app.use('/api/writings', writingRoutes)
// app.use('/api/lesson-progress', lessonProgressRoutes)

// app.use('/api/grade', gradingRoutes) // Tạm thời vô hiệu hóa để chỉ test auth

// app.use('/api/exams', examRoutes)

app.listen(port, '0.0.0.0', () => {
    console.log(`\nServer đã sẵn sàng!`);
    console.log(`-------------------------------------------------------`);
    console.log(`Local:      http://localhost:${port}`);
    console.log(`Swagger:    http://localhost:${port}/api-docs`);
    console.log(`Mobile/LAN: http://192.168.1.11:${port}`);
    console.log(`-------------------------------------------------------`);
});
