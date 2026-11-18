import express from 'express';
import emailMonitoringController from './email-monitoring.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Proteksi: Hanya Admin / Staf berwenang
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @swagger
 * tags:
 *   name: Email Monitoring
 *   description: Monitoring kuota dan status server email SMTP
 */

/**
 * @swagger
 * /api/v1/email-monitoring/quota:
 *   get:
 *     summary: Ambil ringkasan kuota dan pemakaian email
 *     description: Mengambil data jumlah email terkirim dalam 24 jam terakhir, batas kuota harian, persentase pemakaian, dan riwayat email terbaru.
 *     tags: [Email Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data statistik kuota email berhasil diambil
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
 *                   example: Data statistik kuota email berhasil diambil
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Bukan Admin)
 *       500:
 *         description: Internal Server Error
 */
router.get('/quota', emailMonitoringController.getQuotaSummary);

/**
 * @swagger
 * /api/v1/email-monitoring/test-connection:
 *   post:
 *     summary: Tes koneksi ke server email SMTP
 *     description: Memverifikasi konektivitas dan autentikasi kredensial SMTP ke server penyedia (misal Gmail) secara on-demand.
 *     tags: [Email Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Koneksi ke server SMTP berhasil diverifikasi
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       502:
 *         description: Autentikasi atau koneksi SMTP gagal
 *       504:
 *         description: Timeout koneksi ke SMTP
 */
router.post('/test-connection', emailMonitoringController.testConnection);

export default router;
