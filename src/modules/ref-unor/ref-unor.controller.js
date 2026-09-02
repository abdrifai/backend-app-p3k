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
   *       - in: query
   *         name: parentId
   *         schema:
   *           type: string
   *       - in: query
   *         name: level
   *         schema:
   *           type: integer
   *       - in: query
   *         name: isIndukOnly
   *         schema:
   *           type: boolean
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: Berhasil mengambil data
   */
  static getAll = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const parentId = req.query.parentId;
    const level = req.query.level;
    const isIndukOnly = req.query.isIndukOnly === 'true' || req.query.isIndukOnly === true;
    const isActive = req.query.isActive;

    const result = await RefUnorService.getAll({ page, limit, search, parentId, level, isIndukOnly, isActive });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar referensi unit kerja',
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * @swagger
   * /api/v1/ref-unor/tree:
   *   get:
   *     tags: [Referensi Unit Kerja]
   *     summary: Ambil struktur pohon hierarki unit kerja (Parent - Child)
   *     parameters:
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *     responses:
   *       200:
   *         description: Berhasil mengambil struktur hierarki unit kerja
   */
  static getTree = asyncHandler(async (req, res) => {
    const isActive = req.query.isActive;
    const data = await RefUnorService.getTree({ isActive });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil struktur pohon hierarki unit kerja',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/ref-unor/{id}:
   *   get:
   *     tags: [Referensi Unit Kerja]
   *     summary: Ambil detail referensi unit kerja berdasarkan ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Berhasil mengambil detail unit kerja
   */
  static getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await RefUnorService.getById(id);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail referensi unit kerja',
      data
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
   *               parentId:
   *                 type: string
   *               kode:
   *                 type: string
   *               jenis:
   *                 type: string
   *               keterangan:
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
   *               parentId:
   *                 type: string
   *               kode:
   *                 type: string
   *               jenis:
   *                 type: string
   *               keterangan:
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

  /**
   * @swagger
   * /api/v1/ref-unor/{id}/status:
   *   patch:
   *     tags: [Referensi Unit Kerja]
   *     summary: Aktifkan / Nonaktifkan status unit kerja
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Status berhasil diubah
   */
  static toggleStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const data = await RefUnorService.toggleStatus(id, isActive);
    res.status(200).json({
      success: true,
      message: `Unit kerja berhasil ${data.isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
      data
    });
  });
}
