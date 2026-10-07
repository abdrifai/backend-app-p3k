import { Router } from 'express';
import {
  getAntrianPejabat,
  getRiwayatPejabat,
  getStatistikPejabat,
  getMonitoringTte,
  getMonitoringTteStats,
  regeneratePdf,
  signPejabat,
  tolakPejabat,
  resubmitTte
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
 * /api/v1/tte/{id}/regenerate-pdf:
 *   post:
 *     summary: Generate ulang berkas PDF dokumen kontrak dari template Word
 *     tags: [Pejabat TTE]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID usulan perpanjangan kontrak
 *     responses:
 *       200:
 *         description: Berkas PDF berhasil digenerate ulang
 *       404:
 *         description: Dokumen tidak ditemukan
 */
router.post('/:id/regenerate-pdf', monitoringGuard, regeneratePdf);

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

/**
 * @swagger
 * /api/v1/tte/{usulanId}/resubmit:
 *   post:
 *     summary: Ajukan kembali dokumen yang ditolak ke antrean penandatangan
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetStatus:
 *                 type: string
 *                 enum: [MENUNGGU_PARAF_KABAN, MENUNGGU_PARAF_SEKDA, MENUNGGU_TTE_PEGAWAI, MENUNGGU_TTE_BUPATI]
 *               catatan:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dokumen berhasil diajukan ulang ke antrean
 *       400:
 *         description: Dokumen tidak dalam status DITOLAK_PENANDATANGAN
 *       401:
 *         description: Tidak terautentikasi
 *       404:
 *         description: Dokumen tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.post('/:usulanId/resubmit', monitoringGuard, resubmitTte);

export default router;
