import { Router } from 'express';
import userController from './user.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { uploadUserPhoto } from '../../middlewares/upload.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management API
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or Email already registered
 *       500:
 *         description: Server error
 */
router.post('/register', userController.register);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid username or password
 *       500:
 *         description: Server error
 */
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// Current user profile routes
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, uploadUserPhoto.single('foto'), userController.updateProfile);

// Admin-only user management routes
router.get('/', authenticate, authorize('admin'), userController.getAll);
router.put('/:id', authenticate, authorize('admin'), userController.update);
router.delete('/:id', authenticate, authorize('admin'), userController.remove);

export default router;
