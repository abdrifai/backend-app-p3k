import { Router } from 'express';
import {
  getAntrianPegawai,
  getPreviewPegawai,
  cekStatusSertifikatPegawai,
  signPegawai
} from './tte.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { loadPegawai } from '../../middlewares/portal.middleware.js';

const router = Router();

router.use(authenticate, authorize('pegawai'), loadPegawai);

/**
 * @swagger
 * tags:
 *   name: Portal TTE Pegawai
 *   description: Layanan Tanda Tangan Elektronik Kontrak oleh Pegawai PPPK
 */

/**
 * @swagger
 * /api/v1/portal/tte:
 *   get:
 *     summary: Ambil daftar dokumen kontrak yang menunggu tanda tangan pegawai
 *     tags: [Portal TTE Pegawai]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil memuat antrian
 */
router.get('/', getAntrianPegawai);

/**
 * @swagger
 * /api/v1/portal/tte/status-sertifikat:
 *   get:
 *     summary: Cek status sertifikat elektronik BSrE pegawai
 *     tags: [Portal TTE Pegawai]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status sertifikat berhasil diambil
 */
router.get('/status-sertifikat', cekStatusSertifikatPegawai);

/**
 * @swagger
 * /api/v1/portal/tte/{usulanId}/preview:
 *   get:
 *     summary: Ambil detail dan URL draft PDF kontrak
 *     tags: [Portal TTE Pegawai]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usulanId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berhasil memuat preview
 */
router.get('/:usulanId/preview', getPreviewPegawai);

/**
 * @swagger
 * /api/v1/portal/tte/{usulanId}/sign:
 *   post:
 *     summary: Bubuhkan tanda tangan elektronik pegawai pada dokumen kontrak
 *     tags: [Portal TTE Pegawai]
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
 *         description: Tanda tangan berhasil dibubuhkan
 */
router.post('/:usulanId/sign', signPegawai);

export default router;
