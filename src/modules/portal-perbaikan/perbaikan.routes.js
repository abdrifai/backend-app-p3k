import { Router } from 'express';
import {
  getAturan,
  getDaftarUsulan,
  getDetailUsulan,
  buatUsulan,
  revisiUsulan,
  batalkanUsulan
} from './perbaikan.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { loadPegawai } from '../../middlewares/portal.middleware.js';
import { uploadPerbaikanLampiran } from '../../middlewares/upload.middleware.js';

const router = Router();

// Semua rute ini hanya untuk pegawai aktif yang sudah login
router.use(authenticate, authorize('pegawai'), loadPegawai);

/**
 * @swagger
 * /api/v1/portal/perbaikan/aturan:
 *   get:
 *     summary: Ambil aturan dan whitelist usulan perbaikan data
 *     tags: [Portal Perbaikan Pegawai]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Konfigurasi whitelist berhasil diambil
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Hanya pegawai)
 */
router.get('/aturan', getAturan);

/**
 * @swagger
 * /api/v1/portal/perbaikan:
 *   get:
 *     summary: Ambil daftar riwayat usulan perbaikan milik pegawai sendiri
 *     tags: [Portal Perbaikan Pegawai]
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
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Daftar usulan berhasil diambil
 *       401:
 *         description: Unauthorized
 */
router.get('/', getDaftarUsulan);

/**
 * @swagger
 * /api/v1/portal/perbaikan/{id}:
 *   get:
 *     summary: Ambil detail usulan perbaikan milik pegawai sendiri
 *     tags: [Portal Perbaikan Pegawai]
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
router.get('/:id', getDetailUsulan);

/**
 * @swagger
 * /api/v1/portal/perbaikan:
 *   post:
 *     summary: Ajukan usulan perbaikan data baru beserta lampiran berkas
 *     tags: [Portal Perbaikan Pegawai]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - kategori
 *               - aksi
 *               - alasan
 *             properties:
 *               kategori:
 *                 type: string
 *                 enum: [DATA_UTAMA, RIWAYAT_KELUARGA, RIWAYAT_KONTRAK, SK_PENGANGKATAN]
 *               aksi:
 *                 type: string
 *                 enum: [TAMBAH, UBAH, HAPUS]
 *               targetId:
 *                 type: string
 *               dataBaru:
 *                 type: string
 *                 description: JSON stringified data yang diusulkan
 *               alasan:
 *                 type: string
 *               lampiran:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Usulan berhasil diajukan
 *       400:
 *         description: Validasi gagal / data tidak diizinkan
 */
router.post('/', uploadPerbaikanLampiran.array('lampiran', 3), buatUsulan);

/**
 * @swagger
 * /api/v1/portal/perbaikan/{id}:
 *   put:
 *     summary: Kirim revisi usulan perbaikan yang berstatus PERLU_PERBAIKAN
 *     tags: [Portal Perbaikan Pegawai]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - dataBaru
 *               - alasan
 *             properties:
 *               dataBaru:
 *                 type: string
 *               alasan:
 *                 type: string
 *               lampiran:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Revisi berhasil dikirim
 *       400:
 *         description: Status usulan tidak memenuhi syarat revisi
 */
router.put('/:id', uploadPerbaikanLampiran.array('lampiran', 3), revisiUsulan);

/**
 * @swagger
 * /api/v1/portal/perbaikan/{id}:
 *   delete:
 *     summary: Batalkan usulan perbaikan (hanya saat status DIAJUKAN)
 *     tags: [Portal Perbaikan Pegawai]
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
 *         description: Usulan berhasil dibatalkan
 *       400:
 *         description: Usulan tidak dalam status DIAJUKAN
 */
router.delete('/:id', batalkanUsulan);

export default router;
