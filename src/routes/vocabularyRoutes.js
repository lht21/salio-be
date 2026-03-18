// routes/vocabulary.js
import express from 'express';
import {
  getVocabulary,
  getVocabularyById,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  getVocabularyByLesson,
  createVocabularyForLesson,
  getVocabForLearning,
  getVocabWithProgress
} from '../controllers/vocabularyController.js';
import { ro } from '@faker-js/faker';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Vocabulary
 *   description: Vocabulary management and learning progress
 */

// ===== BASIC CRUD ROUTES =====

/**
 * @swagger
 * /api/vocabulary:
 *   get:
 *     summary: Get all vocabulary
 *     tags: [Vocabulary]
 *     responses:
 *       200:
 *         description: Successfully retrieved vocabulary list
 */
router.get('/', getVocabulary);

/**
 * @swagger
 * /api/vocabulary/{id}:
 *   get:
 *     summary: Get vocabulary by ID
 *     tags: [Vocabulary]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vocabulary found
 *       404:
 *         description: Vocabulary not found
 */
router.get('/:id', getVocabularyById);

/**
 * @swagger
 * /api/vocabulary:
 *   post:
 *     summary: Create new vocabulary
 *     tags: [Vocabulary]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Vocabulary created successfully
 */
router.post('/', createVocabulary);

/**
 * @swagger
 * /api/vocabulary/{id}:
 *   put:
 *     summary: Update vocabulary by ID
 *     tags: [Vocabulary]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Vocabulary updated successfully
 */
router.put('/:id', updateVocabulary);

/**
 * @swagger
 * /api/vocabulary/{id}:
 *   delete:
 *     summary: Delete vocabulary by ID
 *     tags: [Vocabulary]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vocabulary deleted successfully
 */
router.delete('/:id', deleteVocabulary);

// ===== LESSON-RELATED ROUTES =====

/**
 * @swagger
 * /api/vocabulary/lesson/{lessonId}:
 *   get:
 *     summary: Get vocabulary by lesson ID
 *     tags: [Vocabulary]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved vocabulary for lesson
 */
router.get('/lesson/:lessonId', getVocabularyByLesson);

/**
 * @swagger
 * /api/vocabulary/lesson/{lessonId}:
 *   post:
 *     summary: Create vocabulary for a lesson
 *     tags: [Vocabulary]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Vocabulary created for lesson
 */
router.post('/lesson/:lessonId', createVocabularyForLesson);

/**
 * @swagger
 * /api/vocabulary/lesson/{lessonId}/learn:
 *   get:
 *     summary: Get vocabulary for learning (flashcard / quiz)
 *     tags: [Vocabulary]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vocabulary list for learning
 */
router.get('/lesson/:lessonId/learn', getVocabForLearning);

/**
 * @swagger
 * /api/vocabulary/lesson/{lessonId}/with-status:
 *   get:
 *     summary: Get vocabulary with learning progress status
 *     tags: [Vocabulary]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vocabulary with learning progress
 */
router.get('/lesson/:lessonId/with-status', getVocabWithProgress);

export default router;
