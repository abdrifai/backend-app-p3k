import { Router } from 'express';
import {
  getInbox,
  getStatistik,
  getDetail,
  prosesUsulan,
  mintaPerbaikan,
  tolakUsulan,
  setujuiUsulan
} from './verifikasi.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// Semua rute verifikasi hanya untuk role 'verifikator' atau 'admin'
router.use(authenticate, authorize('verifikator', 'admin'));

/**
 * @swagger
 * tags:
 *   name: Verifikasi Perbaikan
 *   description: Pengelolaan dan persetujuan usulan perbaikan data pegawai oleh Verifikator / Admin
 */

/**
 * @swagger
 * /api/v1/verifikasi-perbaikan/statistik:
 *   get:
 *     summary: Ambil rekap statistik usulan perbaikan berdasarkan status
 *     tags: [Verifikasi Perbaikan]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil memuat statistik
 */
router.get('/statistik', getStatistik);

/**
 * @swagger
 * /api/v1/verifikasi-perbaikan:
 *   get:
 *     summary: Ambil daftar inbox usulan perbaikan data
 *     tags: [Verifikasi Perbaikan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: kategori
 *         schema:
 *           type: string
 *       - in: query
 *         name: jenisPegawai
 *         schema:
 *           type: string
 *           enum: [PENUH_WAKTU, PARUH_WAKTU]
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
 *         description: Inbox berhasil diambil
 */
router.get('/', getInbox);

/**
 * @swagger
 * /api/v1/verifikasi-perbaikan/{id}:
 *   get:
 *     summary: Ambil detail lengkap usulan perbaikan, perbandingan data, dan lampiran
 *     tags: [Verifikasi Perbaikan]
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
 *         description: Detail usulan berhasil diambil
 *       404:
 *         description: Usulan tidak ditemukan
 */
router.get('/:id', getDetail);

/**
 * @swagger
 * /api/v1/verifikasi-perbaikan/{id}/proses:
 *   patch:
 *     summary: Ubah status usulan menjadi DIPROSES (kunci ke verifikator)
 *     tags: [Verifikasi Perbaikan]
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
 *         description: Status berhasil diubah menjadi DIPROSES
 */
router.patch('/:id/proses', prosesUsulan);

/**
 * @swagger
 * /api/v1/verifikasi-perbaikan/{id}/perlu-perbaikan:
 *   patch:
 *     summary: Kembalikan usulan ke pegawai untuk perbaikan (status PERLU_PERBAIKAN)
 *     tags: [Verifikasi Perbaikan]
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
 *             required:
 *               - catatan
 *             properties:
 *               catatan:
 *                 type: string
 *     responses:
 *       200:
 *         description: Berhasil dikembalikan ke pegawai
 */
router.patch('/:id/perlu-perbaikan', mintaPerbaikan);

/**
 * @swagger
 * /api/v1/verifikasi-perbaikan/{id}/tolak:
 *   patch:
 *     summary: Tolak usulan perbaikan data
 *     tags: [Verifikasi Perbaikan]
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
 *             required:
 *               - catatan
 *             properties:
 *               catatan:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usulan berhasil ditolak
 */
router.patch('/:id/tolak', tolakUsulan);

/**
 * @swagger
 * /api/v1/verifikasi-perbaikan/{id}/setujui:
 *   post:
 *     summary: Setujui usulan dan terapkan perubahan secara atomik ke database pegawai
 *     tags: [Verifikasi Perbaikan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               catatan:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perubahan berhasil diterapkan
 */
router.post('/:id/setujui', setujuiUsulan);

export const verifikasiRoutes = router;
export default router;
