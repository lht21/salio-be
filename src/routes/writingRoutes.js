import express from 'express';
import {
  // Basic CRUD
  getWritings,
  getWritingById,
  createWriting,
  updateWriting,
  deleteWriting,
  
  // Lesson-related
  getWritingsByLesson,
  createWritingForLesson,
  
  // Submission
  submitWriting,
  getSubmissions,
  evaluateSubmission,
  deleteSubmission
  
} from '../controllers/writingController.js';

import { protect, teacher } from '../middlewares/authMiddleware.js';
import { logActivity } from '../middlewares/logMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Writing
 *   description: Writing management, lesson writings, and submissions
 */

// ===== PUBLIC ROUTES =====

/**
 * @swagger
 * /api/writings:
 *   get:
 *     summary: Get all writings
 *     tags: [Writing]
 *     responses:
 *       200:
 *         description: Successfully retrieved writings list
 */
router.get('/', getWritings);

/**
 * @swagger
 * /api/writings/{id}:
 *   get:
 *     summary: Get writing by ID
 *     tags: [Writing]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Writing found
 *       404:
 *         description: Writing not found
 */
router.get('/:id', getWritingById);

// ===== LESSON-RELATED ROUTES =====

/**
 * @swagger
 * /api/writings/lesson/{lessonId}:
 *   get:
 *     summary: Get writings by lesson ID
 *     tags: [Writing]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved writings for lesson
 */
router.get('/lesson/:lessonId', getWritingsByLesson);

/**
 * @swagger
 * /api/writings/lesson/{lessonId}:
 *   post:
 *     summary: Create a writing for a lesson (Teacher only)
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
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
 *         description: Writing created successfully
 *       403:
 *         description: Unauthorized
 */
router.post('/lesson/:lessonId', protect, teacher, logActivity, createWritingForLesson);

// ===== STUDENT ROUTES =====

/**
 * @swagger
 * /api/writings/{id}/submit:
 *   post:
 *     summary: Submit a writing (Student)
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
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
 *         description: Submission successful
 */
router.post('/:id/submit', protect, logActivity, submitWriting);

// ===== TEACHER ROUTES =====

/**
 * @swagger
 * /api/writings:
 *   post:
 *     summary: Create a writing (Teacher only)
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Writing created
 */
router.post('/', protect, teacher, logActivity, createWriting);

/**
 * @swagger
 * /api/writings/{id}:
 *   put:
 *     summary: Update a writing (Teacher only)
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Writing updated
 */
router.put('/:id', protect, teacher, logActivity, updateWriting);

/**
 * @swagger
 * /api/writings/{id}:
 *   delete:
 *     summary: Delete a writing (Teacher only)
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Writing deleted
 */
router.delete('/:id', protect, teacher, logActivity, deleteWriting);

// ===== SUBMISSION MANAGEMENT =====

/**
 * @swagger
 * /api/writings/submissions/all:
 *   get:
 *     summary: Get all submissions (Teacher only)
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved submissions
 */
router.get('/submissions/all', protect, teacher, getSubmissions);

/**
 * @swagger
 * /api/writings/submissions/{id}/evaluate:
 *   put:
 *     summary: Evaluate a submission (Teacher only)
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
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
 *         description: Submission evaluated
 */
router.put('/submissions/:id/evaluate', protect, teacher, logActivity, evaluateSubmission);

/**
 * @swagger
 * /api/writings/submissions/{id}:
 *   delete:
 *     summary: Delete a submission (Teacher only)
 *     tags: [Writing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Submission deleted
 */
router.delete('/submissions/:id', protect, teacher, logActivity, deleteSubmission);

export default router;
