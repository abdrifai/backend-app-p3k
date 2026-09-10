import { asyncHandler } from '../../middlewares/error.middleware.js';
import { PemberhentianService } from './pemberhentian.service.js';
import {
  setPemberhentianSchema,
  updatePemberhentianSchema,
  revertPemberhentianSchema,
  getAllPemberhentianQuerySchema
} from './pemberhentian.validation.js';

export class PemberhentianController {
  /**
   * @swagger
   * /api/v1/pemberhentian/set:
   *   post:
   *     tags: [Manajemen Pemberhentian]
   *     summary: Set status pegawai menjadi Pensiun / Pemberhentian
   *     description: Mengubah status pegawai P3K (Penuh Waktu / Paruh Waktu) menjadi pensiun serta mengunggah SK.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - nipBaru
   *               - nomorSk
   *               - tanggalSk
   *               - file
   *             properties:
   *               nipBaru:
   *                 type: string
   *                 description: NIP Baru Pegawai
   *               nomorSk:
   *                 type: string
   *                 description: Nomor SK Pensiun / Pemberhentian
   *               tanggalSk:
   *                 type: string
   *                 description: Tanggal SK (YYYY-MM-DD)
   *               jenisPensiunId:
   *                 type: string
   *                 description: ID Referensi Jenis Pensiun
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: File SK (PDF, maks 10MB)
   *     responses:
   *       200:
   *         description: Status pemberhentian/pensiun berhasil ditetapkan
   *       400:
   *         description: Validasi gagal atau file SK tidak diunggah
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Data pegawai tidak ditemukan
   *       500:
   *         description: Server error
   */
  static setPemberhentian = asyncHandler(async (req, res) => {
    const { error, value } = setPemberhentianSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File SK Pensiun/Pemberhentian PDF wajib diupload.',
        data: null
      });
    }

    const fileUrl = `/uploads/pensiun-sk/${req.file.filename}`;
    const result = await PemberhentianService.setPemberhentian(
      { ...value, fileUrl },
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: 'Status pegawai berhasil diubah menjadi PENSIUN / PEMBERHENTIAN.',
      data: result
    });
  });
  static setPensiun = this.setPemberhentian;

  /**
   * @swagger
   * /api/v1/pemberhentian:
   *   get:
   *     tags: [Manajemen Pemberhentian]
   *     summary: Daftar semua pegawai yang berstatus Pensiun / Pemberhentian
   *     description: Mengambil data rekap pegawai yang sudah diproses pensiun/pemberhentian dengan filter kategori & jenis pensiun.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: jenisPensiunId
   *         schema:
   *           type: string
   *       - in: query
   *         name: kategori
   *         schema:
   *           type: string
   *           enum: [ALL, PENUH_WAKTU, PARUH_WAKTU]
   *           default: ALL
   *     responses:
   *       200:
   *         description: Berhasil mengambil data pegawai pemberhentian/pensiun
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  static getAllPemberhentian = asyncHandler(async (req, res) => {
    const { error, value } = getAllPemberhentianQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const result = await PemberhentianService.getAllPemberhentian(value);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data pegawai pensiun / pemberhentian.',
      data: result.data,
      meta: result.meta
    });
  });
  static getAllPensiun = this.getAllPemberhentian;

  /**
   * @swagger
   * /api/v1/pemberhentian/update:
   *   put:
   *     tags: [Manajemen Pemberhentian]
   *     summary: Edit data SK & Jenis Pemberhentian / Pensiun
   *     description: Memperbarui nomor SK, tanggal SK, file SK, atau jenis pensiun pegawai yang sudah berstatus pensiun.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - nipBaru
   *             properties:
   *               nipBaru:
   *                 type: string
   *                 description: NIP Baru Pegawai
   *               nomorSk:
   *                 type: string
   *                 description: Nomor SK Baru
   *               tanggalSk:
   *                 type: string
   *                 description: Tanggal SK Baru (YYYY-MM-DD)
   *               jenisPensiunId:
   *                 type: string
   *                 description: ID Referensi Jenis Pensiun
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: File SK Baru (PDF, opsional)
   *     responses:
   *       200:
   *         description: Data SK & Jenis Pemberhentian berhasil diperbarui
   *       400:
   *         description: Validasi gagal atau pegawai belum berstatus pensiun
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Data pegawai tidak ditemukan
   *       500:
   *         description: Server error
   */
  static updatePemberhentian = asyncHandler(async (req, res) => {
    const { error, value } = updatePemberhentianSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/pensiun-sk/${req.file.filename}`;
    }

    const result = await PemberhentianService.updatePemberhentian(
      { ...value, fileUrl },
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: 'Data SK Pensiun / Pemberhentian berhasil diperbarui.',
      data: result
    });
  });
  static updatePensiun = this.updatePemberhentian;

  /**
   * @swagger
   * /api/v1/pemberhentian/revert:
   *   post:
   *     tags: [Manajemen Pemberhentian]
   *     summary: Batalkan status pemberhentian / kembalikan ke AKTIF
   *     description: Mengembalikan status pegawai pensiun kembali menjadi AKTIF dan menghapus tautan SK pensiun.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - nipBaru
   *             properties:
   *               nipBaru:
   *                 type: string
   *                 description: NIP Baru Pegawai
   *     responses:
   *       200:
   *         description: Status pegawai berhasil dikembalikan menjadi AKTIF
   *       400:
   *         description: Pegawai tidak berstatus PENSIUN
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Data pegawai tidak ditemukan
   *       500:
   *         description: Server error
   */
  static revertPemberhentian = asyncHandler(async (req, res) => {
    const { error, value } = revertPemberhentianSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const result = await PemberhentianService.revertPemberhentian(
      value.nipBaru,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: 'Status pegawai berhasil dikembalikan menjadi AKTIF.',
      data: result
    });
  });
  static revertPensiun = this.revertPemberhentian;
}
