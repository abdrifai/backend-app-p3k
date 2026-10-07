import { Router } from 'express';
import {
  getAntrianPejabat,
  getRiwayatPejabat,
  getStatistikPejabat,
  getMonitoringTte,
  getMonitoringTteStats,
  signPejabat,
  tolakPejabat
} from './tte.controller.js';
import { authenticate, authorize, denyRole } from '../../middlewares/auth.middleware.js';

const router = Router();

// Guard untuk Penandatangan (Pejabat & Admin)
const pejabatGuard = [authenticate, authorize('pejabat_ttd', 'admin')];
// Guard untuk Monitoring (Admin, Operator P3K/User, Pejabat)
const monitoringGuard = [authenticate, denyRole('pegawai')];

/**
 * @swagger
 * tags:
 *   name: Pejabat TTE
 *   description: Layanan TTE, Paraf Elektronik, dan Dashboard Monitoring TTE Dokumen Kontrak
 */

/**
 * @swagger
 * /api/v1/tte/monitoring:
 *   get:
 *     summary: Monitoring status TTE seluruh dokumen kontrak untuk Admin dan Operator P3K
 *     tags: [Pejabat TTE]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: statusTte
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Berhasil memuat daftar monitoring TTE
 */
router.get('/monitoring', monitoringGuard, getMonitoringTte);

/**
 * @swagger
 * /api/v1/tte/monitoring/statistik:
 *   get:
 *     summary: Statistik ringkasan monitoring status TTE untuk Admin dan Operator P3K
 *     tags: [Pejabat TTE]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil memuat statistik monitoring TTE
 */
router.get('/monitoring/statistik', monitoringGuard, getMonitoringTteStats);

/**
 * @swagger
 * /api/v1/tte/antrian:
 *   get:
 *     summary: Ambil daftar dokumen kontrak yang menunggu tanda tangan/paraf pejabat yang sedang login
 *     tags: [Pejabat TTE]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Berhasil memuat antrian
 */
router.get('/antrian', pejabatGuard, getAntrianPejabat);

/**
 * @swagger
 * /api/v1/tte/riwayat:
 *   get:
 *     summary: Ambil riwayat dokumen kontrak yang telah ditandatangani/paraf atau ditolak pejabat
 *     tags: [Pejabat TTE]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Berhasil memuat riwayat penandatanganan
 */
router.get('/riwayat', pejabatGuard, getRiwayatPejabat);

/**
 * @swagger
 * /api/v1/tte/statistik:
 *   get:
 *     summary: Ambil ringkasan statistik antrian dan riwayat dokumen penandatangan
 *     tags: [Pejabat TTE]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil memuat statistik
 */
router.get('/statistik', pejabatGuard, getStatistikPejabat);

/**
 * @swagger
 * /api/v1/tte/{usulanId}/sign:
 *   post:
 *     summary: Bubuhkan tanda tangan / paraf elektronik pejabat
 *     tags: [Pejabat TTE]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usulanId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passphrase
 *             properties:
 *               passphrase:
 *                 type: string
 *     responses:
 *       200:
 *         description: Berhasil membubuhkan tanda tangan/paraf
 *       400:
 *         description: Passphrase kosong/salah atau dokumen tidak berada pada tahap jabatan pejabat
 *       401:
 *         description: Tidak terautentikasi
 *       403:
 *         description: User bukan pejabat penandatangan aktif
 *       404:
 *         description: Dokumen tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.post('/:usulanId/sign', pejabatGuard, signPejabat);

/**
 * @swagger
 * /api/v1/tte/{usulanId}/tolak:
 *   post:
 *     summary: Tolak penandatanganan dokumen kontrak
 *     tags: [Pejabat TTE]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usulanId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - catatan
 *             properties:
 *               catatan:
 *                 type: string
 *     responses:
 *       200:
 *         description: Penolakan berhasil dicatat
 *       400:
 *         description: Catatan tidak valid atau dokumen tidak berada pada tahap jabatan pejabat
 *       401:
 *         description: Tidak terautentikasi
 *       403:
 *         description: User bukan pejabat penandatangan aktif
 *       404:
 *         description: Dokumen tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.post('/:usulanId/tolak', pejabatGuard, tolakPejabat);

export default router;
