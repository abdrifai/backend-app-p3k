import { MasalahPegawaiService } from './masalah-pegawai.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import {
  createMasalahPegawaiSchema,
  updateMasalahPegawaiSchema,
  addTindakLanjutSchema,
  filterMasalahQuerySchema
} from './masalah-pegawai.validation.js';

export class MasalahPegawaiController {
  /**
   * @swagger
   * /api/v1/masalah-pegawai:
   *   get:
   *     tags: [Masalah Pegawai]
   *     summary: Ambil daftar masalah pegawai dengan filter dan pagination
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: kategoriId
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *       - in: query
   *         name: tingkatKeparahan
   *         schema:
   *           type: string
   *       - in: query
   *         name: unorIndukId
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Data daftar masalah pegawai berhasil diambil
   */
  static getAll = asyncHandler(async (req, res) => {
    const { error, value } = filterMasalahQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const result = await MasalahPegawaiService.getAllMasalah(value);
    res.status(200).json({
      success: true,
      message: 'Daftar masalah pegawai berhasil diambil',
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * @swagger
   * /api/v1/masalah-pegawai/rekap:
   *   get:
   *     tags: [Masalah Pegawai]
   *     summary: Ambil data statistik dan rekapitulasi masalah pegawai
   *     responses:
   *       200:
   *         description: Statistik rekapitulasi berhasil diambil
   */
  static getRekap = asyncHandler(async (req, res) => {
    const data = await MasalahPegawaiService.getRekapStats();
    res.status(200).json({
      success: true,
      message: 'Statistik rekap masalah pegawai berhasil diambil',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/masalah-pegawai/generate-nomor:
   *   get:
   *     tags: [Masalah Pegawai]
   *     summary: Ambil nomor urut kasus berikutnya secara otomatis
   *     responses:
   *       200:
   *         description: Nomor kasus berikutnya berhasil dibuat
   */
  static generateNomor = asyncHandler(async (req, res) => {
    const nomorKasus = await MasalahPegawaiService.getNextNomorKasus();
    res.status(200).json({
      success: true,
      message: 'Nomor kasus berhasil di-generate',
      data: { nomorKasus }
    });
  });

  /**
   * @swagger
   * /api/v1/masalah-pegawai/export-excel:
   *   get:
   *     tags: [Masalah Pegawai]
   *     summary: Export data rekapitulasi masalah pegawai ke format Excel (.xlsx)
   */
  static exportExcel = asyncHandler(async (req, res) => {
    const buffer = await MasalahPegawaiService.exportToExcel(req.query);

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Rekap_Masalah_Pegawai_${timestamp}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  });

  /**
   * @swagger
   * /api/v1/masalah-pegawai/pegawai/{dataP3kId}:
   *   get:
   *     tags: [Masalah Pegawai]
   *     summary: Ambil seluruh riwayat catatan masalah untuk satu pegawai tertentu
   */
  static getByPegawai = asyncHandler(async (req, res) => {
    const data = await MasalahPegawaiService.getMasalahByPegawai(req.params.dataP3kId);
    res.status(200).json({
      success: true,
      message: 'Riwayat masalah pegawai berhasil diambil',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/masalah-pegawai/{id}:
   *   get:
   *     tags: [Masalah Pegawai]
   *     summary: Ambil detail lengkap artikel catatan masalah dan timeline penanganan
   */
  static getById = asyncHandler(async (req, res) => {
    const data = await MasalahPegawaiService.getMasalahById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Detail masalah pegawai berhasil diambil',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/masalah-pegawai:
   *   post:
   *     tags: [Masalah Pegawai]
   *     summary: Buat artikel catatan masalah pegawai baru (dukung multi-upload lampiran)
   *     security:
   *       - bearerAuth: []
   */
  static create = asyncHandler(async (req, res) => {
    const { error, value } = createMasalahPegawaiSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const files = req.files || (req.file ? [req.file] : []);
    const userId = req.user.id;

    const data = await MasalahPegawaiService.createMasalah(value, files, userId);
    res.status(201).json({
      success: true,
      message: 'Catatan masalah pegawai berhasil disimpan',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/masalah-pegawai/{id}:
   *   put:
   *     tags: [Masalah Pegawai]
   *     summary: Update artikel catatan masalah pegawai
   *     security:
   *       - bearerAuth: []
   */
  static update = asyncHandler(async (req, res) => {
    const { error, value } = updateMasalahPegawaiSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const files = req.files || (req.file ? [req.file] : []);
    const userId = req.user.id;

    const data = await MasalahPegawaiService.updateMasalah(req.params.id, value, files, userId);
    res.status(200).json({
      success: true,
      message: 'Catatan masalah pegawai berhasil diperbarui',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/masalah-pegawai/{id}/tindak-lanjut:
   *   post:
   *     tags: [Masalah Pegawai]
   *     summary: Tambahkan riwayat tindak lanjut / update progres penanganan
   *     security:
   *       - bearerAuth: []
   */
  static addTindakLanjut = asyncHandler(async (req, res) => {
    const { error, value } = addTindakLanjutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const userId = req.user.id;
    const data = await MasalahPegawaiService.addTindakLanjut(req.params.id, value, userId);
    res.status(200).json({
      success: true,
      message: 'Riwayat tindak lanjut berhasil ditambahkan',
      data
    });
  });

  /**
   * @swagger
   * /api/v1/masalah-pegawai/{id}:
   *   delete:
   *     tags: [Masalah Pegawai]
   *     summary: Hapus (soft-delete) catatan masalah pegawai
   *     security:
   *       - bearerAuth: []
   */
  static delete = asyncHandler(async (req, res) => {
    await MasalahPegawaiService.deleteMasalah(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Catatan masalah pegawai berhasil dihapus',
      data: null
    });
  });

  /**
   * @swagger
   * /api/v1/masalah-pegawai/lampiran/{lampiranId}:
   *   delete:
   *     tags: [Masalah Pegawai]
   *     summary: Hapus (soft-delete) lampiran bukti masalah
   *     security:
   *       - bearerAuth: []
   */
  static deleteLampiran = asyncHandler(async (req, res) => {
    await MasalahPegawaiService.deleteLampiran(req.params.lampiranId);
    res.status(200).json({
      success: true,
      message: 'Lampiran berhasil dihapus',
      data: null
    });
  });
}
