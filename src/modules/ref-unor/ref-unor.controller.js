import { RefUnorService } from './ref-unor.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { refUnorSchema } from './ref-unor.validation.js';

export class RefUnorController {
  /**
   * @swagger
   * /api/v1/ref-unor:
   *   get:
   *     tags: [Referensi Unit Kerja]
   *     summary: Ambil daftar referensi unit kerja
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
   *     responses:
   *       200:
   *         description: Berhasil mengambil data
   */
  static getAll = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const result = await RefUnorService.getAll({ page, limit, search });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar referensi unit kerja',
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * @swagger
   * /api/v1/ref-unor:
   *   post:
   *     tags: [Referensi Unit Kerja]
   *     summary: Tambah baru referensi unit kerja
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nama:
   *                 type: string
   *     responses:
   *       201:
   *         description: Data berhasil disimpan
   */
  static create = asyncHandler(async (req, res) => {
    const { error, value } = refUnorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const data = await RefUnorService.create(value);
    res.status(201).json({
      success: true,
      message: 'Referensi unit kerja berhasil ditambahkan',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/ref-unor/{id}:
   *   put:
   *     tags: [Referensi Unit Kerja]
   *     summary: Update referensi unit kerja
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
   *               nama:
   *                 type: string
   *     responses:
   *       200:
   *         description: Data berhasil diperbarui
   */
  static update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { error, value } = refUnorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const data = await RefUnorService.update(id, value);
    res.status(200).json({
      success: true,
      message: 'Referensi unit kerja berhasil diperbarui',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/ref-unor/{id}:
   *   delete:
   *     tags: [Referensi Unit Kerja]
   *     summary: Hapus (soft delete) referensi unit kerja
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Data berhasil dihapus
   */
  static delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await RefUnorService.delete(id);
    res.status(200).json({
      success: true,
      message: 'Referensi unit kerja berhasil dihapus',
      data: null
    });
  });
}
