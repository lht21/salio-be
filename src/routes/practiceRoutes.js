import express from 'express';
import {
    getPracticeSets,
    getPracticeSetById,
    getPracticeHistory,
    startAttempt
} from '../controllers/practiceController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect); // Toàn bộ route yêu cầu là Student/User đã login

router.get('/history', getPracticeHistory);
router.get('/:type/sets', getPracticeSets);
router.get('/:type/sets/:setId', getPracticeSetById);
router.post('/:type/sets/:setId/start', startAttempt);

export default router;