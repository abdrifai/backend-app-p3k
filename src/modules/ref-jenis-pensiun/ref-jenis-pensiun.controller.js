import { RefJenisPensiunService } from './ref-jenis-pensiun.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { createJenisPensiunSchema, updateJenisPensiunSchema } from './ref-jenis-pensiun.validation.js';

export class RefJenisPensiunController {
  /**
   * @swagger
   * /api/v1/ref-jenis-pensiun:
   *   get:
   *     tags: [Referensi Jenis Pensiun]
   *     summary: Ambil semua referensi jenis pensiun
   *     parameters:
   *       - in: query
   *         name: onlyActive
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Berhasil mengambil data referensi jenis pensiun
   */
  static getAll = asyncHandler(async (req, res) => {
    const onlyActive = req.query.onlyActive === 'true';
    const search = req.query.search || '';

    const data = await RefJenisPensiunService.getAll({ onlyActive, search });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil referensi jenis pensiun',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/ref-jenis-pensiun/{id}:
   *   get:
   *     tags: [Referensi Jenis Pensiun]
   *     summary: Ambil detail referensi jenis pensiun berdasarkan ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Berhasil mengambil detail
   *       404:
   *         description: Tidak ditemukan
   */
  static getById = asyncHandler(async (req, res) => {
    const data = await RefJenisPensiunService.getById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail jenis pensiun',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/ref-jenis-pensiun:
   *   post:
   *     tags: [Referensi Jenis Pensiun]
   *     summary: Tambah jenis pensiun baru
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nama]
   *             properties:
   *               kode:
   *                 type: string
   *               nama:
   *                 type: string
   *               keterangan:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Jenis pensiun berhasil ditambahkan
   */
  static create = asyncHandler(async (req, res) => {
    const { error, value } = createJenisPensiunSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const data = await RefJenisPensiunService.create(value);

    res.status(201).json({
      success: true,
      message: 'Jenis pensiun berhasil ditambahkan',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/ref-jenis-pensiun/{id}:
   *   put:
   *     tags: [Referensi Jenis Pensiun]
   *     summary: Perbarui data jenis pensiun
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
   *               keterangan:
   *                 type: string
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Jenis pensiun berhasil diperbarui
   */
  static update = asyncHandler(async (req, res) => {
    const { error, value } = updateJenisPensiunSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const data = await RefJenisPensiunService.update(req.params.id, value);

    res.status(200).json({
      success: true,
      message: 'Jenis pensiun berhasil diperbarui',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/ref-jenis-pensiun/{id}:
   *   delete:
   *     tags: [Referensi Jenis Pensiun]
   *     summary: Hapus jenis pensiun (soft delete)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Jenis pensiun berhasil dihapus
   */
  static delete = asyncHandler(async (req, res) => {
    await RefJenisPensiunService.delete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Jenis pensiun berhasil dihapus',
      data: null
    });
  });
}
