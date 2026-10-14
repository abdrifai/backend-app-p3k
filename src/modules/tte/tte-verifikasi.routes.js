import { Router } from 'express';
import { getVerifikasiDokumen } from './tte-verifikasi.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Verifikasi Dokumen Publik
 *   description: Layanan publik pemindaian QR Code untuk verifikasi keabsahan dokumen TTE & paraf
 */

/**
 * @swagger
 * /api/v1/portal/verifikasi/{usulanId}:
 *   get:
 *     summary: Verifikasi keabsahan dokumen tanda tangan elektronik dan paraf koordinasi
 *     tags: [Verifikasi Dokumen Publik]
 *     parameters:
 *       - in: path
 *         name: usulanId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dokumen usulan perpanjangan kontrak
 *     responses:
 *       200:
 *         description: Data verifikasi dokumen berhasil diambil
 *       400:
 *         description: ID Usulan tidak valid
 *       404:
 *         description: Dokumen tidak ditemukan
 */
router.get('/:usulanId', getVerifikasiDokumen);

export default router;
