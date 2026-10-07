import { Router } from 'express';
import {
  listPejabat,
  createPejabat,
  updatePejabat,
  deletePejabat
} from './tte.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// CRUD Konfigurasi Pejabat hanya untuk admin
router.use(authenticate, authorize('admin'));

/**
 * @swagger
 * tags:
 *   name: Pejabat Penandatangan Admin
 *   description: Manajemen Pejabat Penandatangan Elektronik BSrE (Kepala BKPSDM, Sekda, Bupati)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PejabatPenandatanganInput:
 *       type: object
 *       required: [userId, jabatan, nama, nik, jenis, urutan]
 *       properties:
 *         userId:
 *           type: string
 *           description: ID akun user (wajib memiliki role pejabat_ttd)
 *         jabatan:
 *           type: string
 *           enum: [KEPALA_BKPSDM, SEKDA, BUPATI]
 *         nama:
 *           type: string
 *         nip:
 *           type: string
 *           nullable: true
 *         nik:
 *           type: string
 *           example: "3201010101700001"
 *         jenis:
 *           type: string
 *           enum: [PARAF, TTE]
 *         urutan:
 *           type: integer
 *           example: 1
 *         isActive:
 *           type: boolean
 *           default: true
 */

/**
 * @swagger
 * /api/v1/pejabat-penandatangan:
 *   get:
 *     summary: Daftar pejabat penandatangan
 *     description: Mengambil seluruh konfigurasi pejabat penandatangan (belum dihapus), diurutkan berdasarkan urutan alur.
 *     tags: [Pejabat Penandatangan Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil
 *       401:
 *         description: Tidak terautentikasi
 *       403:
 *         description: Bukan admin
 *       500:
 *         description: Kesalahan server
 *   post:
 *     summary: Tambah pejabat penandatangan
 *     description: |
 *       Menautkan akun user ber-role `pejabat_ttd` ke jabatan penandatangan.
 *       Hanya boleh ada satu pejabat aktif per jabatan. Jika akun pernah didaftarkan lalu dihapus, record lama dipulihkan.
 *     tags: [Pejabat Penandatangan Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PejabatPenandatanganInput'
 *     responses:
 *       201:
 *         description: Pejabat berhasil ditambahkan
 *       400:
 *         description: Validasi gagal / akun belum memiliki role pejabat_ttd
 *         content:
 *           application/json:
 *             example: { success: false, data: null, message: 'Akun pengguna belum memiliki role "pejabat_ttd"...' }
 *       401:
 *         description: Tidak terautentikasi
 *       404:
 *         description: Akun user tidak ditemukan
 *       409:
 *         description: Jabatan sudah diisi pejabat aktif lain / akun sudah terdaftar
 *       500:
 *         description: Kesalahan server
 */
router.get('/', listPejabat);
router.post('/', createPejabat);

/**
 * @swagger
 * /api/v1/pejabat-penandatangan/{id}:
 *   put:
 *     summary: Perbarui pejabat penandatangan
 *     description: Memperbarui sebagian/seluruh data pejabat. Aturan satu jabatan aktif tetap berlaku.
 *     tags: [Pejabat Penandatangan Admin]
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
 *             $ref: '#/components/schemas/PejabatPenandatanganInput'
 *     responses:
 *       200:
 *         description: Berhasil diperbarui
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Tidak terautentikasi
 *       404:
 *         description: Pejabat tidak ditemukan
 *       409:
 *         description: Jabatan bentrok / akun sudah tertaut ke pejabat lain
 *       500:
 *         description: Kesalahan server
 *   delete:
 *     summary: Hapus (soft delete) pejabat penandatangan
 *     tags: [Pejabat Penandatangan Admin]
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
 *         description: Berhasil dinonaktifkan
 *       401:
 *         description: Tidak terautentikasi
 *       404:
 *         description: Pejabat tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.put('/:id', updatePejabat);
router.delete('/:id', deletePejabat);

export default router;
