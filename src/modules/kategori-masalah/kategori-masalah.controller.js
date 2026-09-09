import { KategoriMasalahService } from './kategori-masalah.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { createKategoriSchema, updateKategoriSchema } from './kategori-masalah.validation.js';

export class KategoriMasalahController {
  /**
   * @swagger
   * /api/v1/kategori-masalah:
   *   get:
   *     tags: [Kategori Masalah]
   *     summary: Ambil daftar seluruh kategori masalah pegawai
   *     parameters:
   *       - in: query
   *         name: onlyActive
   *         schema:
   *           type: boolean
   *         description: Filter hanya kategori yang aktif
   *     responses:
   *       200:
   *         description: Daftar kategori berhasil diambil
   */
  static getAll = asyncHandler(async (req, res) => {
    const data = await KategoriMasalahService.getAllKategori(req.query);
    res.status(200).json({
      success: true,
      message: 'Daftar kategori masalah berhasil diambil',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/kategori-masalah/{id}:
   *   get:
   *     tags: [Kategori Masalah]
   *     summary: Ambil detail kategori masalah berdasarkan ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Detail kategori ditemukan
   *       404:
   *         description: Kategori tidak ditemukan
   */
  static getById = asyncHandler(async (req, res) => {
    const data = await KategoriMasalahService.getKategoriById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Detail kategori masalah berhasil diambil',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/kategori-masalah:
   *   post:
   *     tags: [Kategori Masalah]
   *     summary: Tambah kategori masalah baru
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [kode, nama]
   *             properties:
   *               kode:
   *                 type: string
   *               nama:
   *                 type: string
   *               deskripsi:
   *                 type: string
   *               warnaBadge:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Kategori berhasil dibuat
   *       400:
   *         description: Validasi gagal atau kode duplikat
   */
  static create = asyncHandler(async (req, res) => {
    const { error, value } = createKategoriSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const data = await KategoriMasalahService.createKategori(value);
    res.status(201).json({
      success: true,
      message: 'Kategori masalah berhasil ditambahkan',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/kategori-masalah/{id}:
   *   put:
   *     tags: [Kategori Masalah]
   *     summary: Update kategori masalah
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
   *             properties:
   *               kode:
   *                 type: string
   *               nama:
   *                 type: string
   *               deskripsi:
   *                 type: string
   *               warnaBadge:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Kategori berhasil diupdate
   *       400:
   *         description: Validasi gagal
   *       404:
   *         description: Kategori tidak ditemukan
   */
  static update = asyncHandler(async (req, res) => {
    const { error, value } = updateKategoriSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const data = await KategoriMasalahService.updateKategori(req.params.id, value);
    res.status(200).json({
      success: true,
      message: 'Kategori masalah berhasil diperbarui',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/kategori-masalah/{id}:
   *   delete:
   *     tags: [Kategori Masalah]
   *     summary: Hapus (soft-delete) kategori masalah
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
   *         description: Kategori berhasil dihapus
   *       404:
   *         description: Kategori tidak ditemukan
   */
  static delete = asyncHandler(async (req, res) => {
    await KategoriMasalahService.deleteKategori(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Kategori masalah berhasil dihapus',
      data: null
    });
  });
}
