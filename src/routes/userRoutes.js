import express from 'express'
const router = express.Router();


import { getMe, updateMe, uploadAvatar, changePassword } from '../controllers/userController';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadAvatar } from '../middlewares/upload';
import { updateProfileRules, changePasswordRules } from '../middlewares/validation';

// All /users routes require authentication
router.use(authenticate);

// GET  /api/v1/users/me
router.get('/me', getMe);

// PATCH /api/v1/users/me
router.patch('/me', updateProfileRules, updateMe);

// POST /api/v1/users/me/avatar
router.post('/me/avatar', uploadAvatar, uploadAvatar);

// POST /api/v1/users/me/change-password
router.post('/me/change-password', changePasswordRules, changePassword);

module.exports = router;