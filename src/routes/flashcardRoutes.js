import express from 'express';
import {
    getFlashcardSets,
    createFlashcardSet,
    getFlashcardSetById,
    updateFlashcardSet,
    deleteFlashcardSet,
    addCardsToSet,
    removeCardFromSet
} from '../controllers/flashcardController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Tất cả các API Flashcard đều yêu cầu User đăng nhập
router.use(protect);

router.route('/')
    .get(getFlashcardSets)
    .post(createFlashcardSet);

router.route('/:id')
    .get(getFlashcardSetById)
    .patch(updateFlashcardSet)
    .delete(deleteFlashcardSet);

router.post('/:id/cards', addCardsToSet);
router.delete('/:id/cards/:vocabId', removeCardFromSet);

export default router;