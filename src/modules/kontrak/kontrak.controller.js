import { KontrakService } from './kontrak.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { addContractSchema, updateContractSchema } from './kontrak.validation.js';

export class KontrakController {
  /**
   * @swagger
   * /api/v1/kontrak/{nipBaru}:
   *   get:
   *     tags: [Riwayat Kontrak]
   *     summary: Ambil riwayat kontrak pegawai berdasarkan NIP
   *     parameters:
   *       - in: path
   *         name: nipBaru
   *         schema:
   *           type: string
   *         required: true
   *         description: NIP Baru Pegawai
   *     responses:
   *       200:
   *         description: Berhasil mengambil riwayat kontrak
   *       404:
   *         description: Data P3K tidak ditemukan
   */
  static getByNipBaru = asyncHandler(async (req, res) => {
    const { nipBaru } = req.params;
    const result = await KontrakService.getByNipBaru(nipBaru);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil riwayat kontrak',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/kontrak:
   *   post:
   *     tags: [Riwayat Kontrak]
   *     summary: Tambah kontrak baru / perpanjangan kontrak
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - nipBaru
   *               - tanggalMulai
   *               - tanggalSelesai
   *             properties:
   *               nipBaru:
   *                 type: string
   *               tanggalMulai:
   *                 type: string
   *                 description: Tanggal mulai kontrak (DD-MM-YYYY)
   *               tanggalSelesai:
   *                 type: string
   *                 description: Tanggal selesai kontrak (DD-MM-YYYY)
   *               keterangan:
   *                 type: string
   *               nomorKontrak:
   *                 type: string
   *               golongan:
   *                 type: string
   *               gajiPokok:
   *                 type: number
   *               mkTahun:
   *                 type: number
   *               mkBulan:
   *                 type: number
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: File arsip kontrak (PDF)
   *     responses:
   *       201:
   *         description: Kontrak berhasil ditambahkan
   *       400:
   *         description: Validasi gagal
   *       404:
   *         description: Data P3K tidak ditemukan
   */
  static addContract = asyncHandler(async (req, res) => {
    const { error, value } = addContractSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    let fileUrl = null;
    let namaFile = null;
    if (req.file) {
      fileUrl = `/uploads/kontrak-arsip/${req.file.filename}`;
      namaFile = req.file.originalname;
    }

    const result = await KontrakService.addContract({
      ...value,
      fileUrl,
      namaFile
    });

    res.status(201).json({
      success: true,
      message: 'Kontrak baru berhasil ditambahkan.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/kontrak/{id}:
   *   put:
   *     tags: [Riwayat Kontrak]
   *     summary: Update data kontrak
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *         required: true
   *         description: ID Riwayat Kontrak
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               tanggalMulai:
   *                 type: string
   *               tanggalSelesai:
   *                 type: string
   *               keterangan:
   *                 type: string
   *               nomorKontrak:
   *                 type: string
   *               golongan:
   *                 type: string
   *               gajiPokok:
   *                 type: number
   *               mkTahun:
   *                 type: number
   *               mkBulan:
   *                 type: number
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Kontrak berhasil diperbarui
   *       400:
   *         description: Validasi gagal
   *       404:
   *         description: Riwayat kontrak tidak ditemukan
   */
  static updateContract = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { error, value } = updateContractSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    let fileUrl = null;
    let namaFile = null;
    if (req.file) {
      fileUrl = `/uploads/kontrak-arsip/${req.file.filename}`;
      namaFile = req.file.originalname;
    }

    const result = await KontrakService.updateContract(id, {
      ...value,
      fileUrl,
      namaFile
    });

    res.status(200).json({
      success: true,
      message: 'Data kontrak berhasil diperbarui.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/kontrak/{id}:
   *   delete:
   *     tags: [Riwayat Kontrak]
   *     summary: Hapus riwayat kontrak (soft delete)
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *         required: true
   *     responses:
   *       200:
   *         description: Kontrak berhasil dihapus
   *       404:
   *         description: Riwayat kontrak tidak ditemukan
   */
  static deleteContract = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await KontrakService.deleteContract(id);

    res.status(200).json({
      success: true,
      message: 'Riwayat kontrak berhasil dihapus.',
      data: null
    });
  });
}
