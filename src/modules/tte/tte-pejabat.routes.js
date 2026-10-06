import { Router } from 'express';
import {
  getAntrianPejabat,
  signPejabat,
  tolakPejabat
} from './tte.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// Pejabat penandatangan: role 'pejabat_ttd' atau 'admin'
router.use(authenticate, authorize('pejabat_ttd', 'admin'));

/**
 * @swagger
 * tags:
 *   name: Pejabat TTE
 *   description: Layanan TTE dan Paraf Elektronik Dokumen Kontrak oleh Pejabat Pemda
 */

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
router.get('/antrian', getAntrianPejabat);

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
 */
router.post('/:usulanId/sign', signPejabat);

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
 */
router.post('/:usulanId/tolak', tolakPejabat);

export default router;
