import { Router } from 'express';
import portalController from './portal.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { loadPegawai } from '../../middlewares/portal.middleware.js';

const router = Router();

// Semua rute portal wajib login sebagai pegawai dan data pegawai aktif
router.use(authenticate, authorize('pegawai'), loadPegawai);

/**
 * @swagger
 * tags:
 *   name: Portal Pegawai
 *   description: Layanan mandiri pegawai PPPK (Penuh Waktu dan Paruh Waktu)
 */

/**
 * @swagger
 * /api/v1/portal/me:
 *   get:
 *     summary: Ambil data profil lengkap pegawai milik sendiri
 *     tags: [Portal Pegawai]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil memuat data profil
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (bukan role pegawai / tidak aktif)
 */
router.get('/me', portalController.getMyProfile);

/**
 * @swagger
 * /api/v1/portal/me/riwayat-kontrak:
 *   get:
 *     summary: Ambil daftar riwayat kontrak milik sendiri
 *     tags: [Portal Pegawai]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil memuat riwayat kontrak
 */
router.get('/me/riwayat-kontrak', portalController.getMyRiwayatKontrak);

/**
 * @swagger
 * /api/v1/portal/me/keluarga:
 *   get:
 *     summary: Ambil daftar riwayat keluarga milik sendiri
 *     tags: [Portal Pegawai]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil memuat riwayat keluarga
 */
router.get('/me/keluarga', portalController.getMyKeluarga);

/**
 * @swagger
 * /api/v1/portal/me/sk-pengangkatan:
 *   get:
 *     summary: Ambil data SK pengangkatan pertama milik sendiri
 *     tags: [Portal Pegawai]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil memuat data SK pengangkatan
 */
router.get('/me/sk-pengangkatan', portalController.getMySkPengangkatan);

/**
 * @swagger
 * /api/v1/portal/me/perpanjangan:
 *   get:
 *     summary: Ambil status usulan perpanjangan kontrak aktif
 *     tags: [Portal Pegawai]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil memuat status perpanjangan kontrak
 */
router.get('/me/perpanjangan', portalController.getMyPerpanjangan);

export const portalRoutes = router;
export default router;
