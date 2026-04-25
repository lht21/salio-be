import express from 'express';
import {
    getAttemptStatus,
    saveAnswer,
    submitAttempt,
    getAttemptResult,
    reviewAttempt
} from '../controllers/practiceController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect); // Toàn bộ route yêu cầu là Student/User đã login (Admins có cơ chế Bypass Role trong Controller)

router.get('/:attemptId', getAttemptStatus);
router.post('/:attemptId/save-answer', saveAnswer);
router.post('/:attemptId/submit', submitAttempt);
router.get('/:attemptId/result', getAttemptResult);
router.get('/:attemptId/review', reviewAttempt);

export default router;