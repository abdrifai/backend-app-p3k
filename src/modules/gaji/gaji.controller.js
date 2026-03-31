import { GajiService } from './gaji.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { createGajiSchema } from './gaji.validation.js';

export class GajiController {
  /**
   * @swagger
   * /api/v1/gaji:
   *   get:
   *     tags: [Gaji]
   *     summary: Ambil data referensi gaji dengan paginasi
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Nomor halaman
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Jumlah data per halaman
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Pencarian berdasarkan golongan
   *     responses:
   *       200:
   *         description: Berhasil mengambil data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: array
   *                 meta:
   *                   type: object
   */
  static getAll = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    
    const result = await GajiService.getAll(page, limit, search);
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar gaji',
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * @swagger
   * /api/v1/gaji:
   *   post:
   *     tags: [Gaji]
   *     summary: Tambah data referensi gaji baru
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               golongan:
   *                 type: string
   *               mkTahun:
   *                 type: integer
   *               gaji:
   *                 type: integer
   *               aturanGaji:
   *                 type: string
   *                 description: "Dasar aturan gaji (opsional)"
   *     responses:
   *       201:
   *         description: Data berhasil ditambahkan
   */
  static create = asyncHandler(async (req, res) => {
    const { error, value } = createGajiSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message, data: null });
    }

    try {
      const result = await GajiService.create(value);
      res.status(201).json({
        success: true,
        message: 'Data gaji berhasil ditambahkan',
        data: result
      });
    } catch (err) {
      if (err.code === 'P2002') {
        res.status(400).json({ success: false, message: 'Data golongan dan masa kerja tahun ini sudah ada', data: null });
      } else {
        throw err;
      }
    }
  });

  /**
   * @swagger
   * /api/v1/gaji/{id}:
   *   delete:
   *     tags: [Gaji]
   *     summary: Hapus referensi gaji
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Berhasil dihapus
   */
  static delete = asyncHandler(async (req, res) => {
    await GajiService.deleteById(req.params.id);
    res.status(200).json({ success: true, message: 'Data gaji berhasil dihapus', data: null });
  });

  /**
   * @swagger
   * /api/v1/gaji/lookup:
   *   get:
   *     tags: [Gaji]
   *     summary: Pencarian (lookup) besaran gaji berdasarkan golongan dan masa kerja
   *     parameters:
   *       - in: query
   *         name: golongan
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: mkTahun
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Berhasil menemukan gaji
   *       404:
   *         description: Gaji tidak ditemukan
   */
  static lookup = asyncHandler(async (req, res) => {
    const { golongan, mkTahun } = req.query;
    if (!golongan || mkTahun === undefined) {
      return res.status(400).json({ success: false, message: 'golongan dan mkTahun harus diisi', data: null });
    }

    const data = await GajiService.lookup(golongan, mkTahun);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Gaji tidak ditemukan untuk parameter tersebut', data: null });
    }

    res.status(200).json({
      success: true,
      message: 'Besaran gaji berhasil ditemukan',
      data
    });
  });
}
