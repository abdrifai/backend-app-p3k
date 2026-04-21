import express from 'express';
import { checkHealth } from './health.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Mengecek status kesehatan aplikasi
 *     description: Mengembalikan status ketersediaan API dan koneksi database.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API dan database berjalan normal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'App-P3K API and Database are running.'
 *                 data:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: 'Connected'
 *       500:
 *         description: API berjalan normal, tetapi database disconnected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'App-P3K API is running, but Database is DISCONNECTED.'
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 */
router.get('/', checkHealth);

export const healthRoutes = router;
