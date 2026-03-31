import { asyncHandler } from '../../middlewares/error.middleware.js';
import { P3kCsvImportService } from './p3k-csv-import.service.js';

export class P3kCsvImportController {
  /**
   * @swagger
   * /api/v1/p3k-csv-import:
   *   post:
   *     tags: [P3K CSV Import]
   *     summary: Import data PPPK dari file CSV
   *     description: Endpoint untuk mengunggah file CSV berisikan data PPPK (NIP_LAMA, NIP_BARU, dll) dan menyimpannya ke database.
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             $ref: '#/components/schemas/UploadCsvRequest'
   *     responses:
   *       201:
   *         description: Import berhasil
   *       400:
   *         description: Bad request (file tidak ada atau format salah)
   *       500:
   *         description: Server error
   */
  static uploadCsv = asyncHandler(async (req, res) => {
    // File validation already done in middleware using Joi
    const fileBuffer = req.file.buffer;

    const result = await P3kCsvImportService.processCsv(fileBuffer);

    res.status(201).json({
      success: true,
      message: 'Data PPPK berhasil diimpor',
      data: {
        importedCount: result.count
      }
    });
  });

  /**
   * @swagger
   * /api/v1/p3k-csv-import/last-import-time:
   *   get:
   *     tags: [P3K CSV Import]
   *     summary: Waktu import data terakhir
   *     description: Mengembalikan waktu terakhir data CSV diimpor.
   *     responses:
   *       200:
   *         description: Berhasil
   *       500:
   *         description: Server error
   */
  static getLastImportTime = asyncHandler(async (req, res) => {
    const lastImportTime = await P3kCsvImportService.getLastImportTime();

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil waktu import terakhir',
      data: { lastImportTime }
    });
  });

  /**
   * @swagger
   * /api/v1/p3k-csv-import:
   *   get:
   *     tags: [P3K CSV Import]
   *     summary: Ambil data PPPK dengan paginasi
   *     description: Endpoint untuk mengambil senarai data PPPK yang sebelumnya telah berhasil diimpor.
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
   *     responses:
   *       200:
   *         description: Berhasil mengambil data
   *       500:
   *         description: Server error
   */
  static getAllP3kData = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const unitKerja = req.query.unitKerja || '';
    const tanggalSkCpns = req.query.tanggalSkCpns || '';

    const result = await P3kCsvImportService.getAllP3kData({ page, limit, search, unitKerja, tanggalSkCpns });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data PPPK',
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * @swagger
   * /api/v1/p3k-csv-import/statistics:
   *   get:
   *     tags: [P3K CSV Import]
   *     summary: Ambil statistik data PPPK
   *     description: Endpoint untuk mengambil ringkasan statistik data PPPK (total, gender, pendidikan, unit kerja, dll).
   *     responses:
   *       200:
   *         description: Berhasil mengambil statistik
   *       500:
   *         description: Server error
   */
  static getStatistics = asyncHandler(async (req, res) => {
    const result = await P3kCsvImportService.getStatistics();

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil statistik PPPK',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/p3k-csv-import/retirement:
   *   get:
   *     tags: [P3K CSV Import]
   *     summary: Laporan pegawai memasuki usia pensiun
   *     description: Endpoint untuk mengambil daftar pegawai PPPK yang memasuki usia pensiun (58 tahun) pada tahun tertentu.
   *     parameters:
   *       - in: query
   *         name: year
   *         required: true
   *         schema:
   *           type: integer
   *         description: Tahun pensiun yang ingin dilihat
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
   *         description: Berhasil mengambil laporan pensiun
   *       400:
   *         description: Parameter tahun tidak valid
   *       500:
   *         description: Server error
   */
  static getRetirementReport = asyncHandler(async (req, res) => {
    const year = parseInt(req.query.year);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    if (!year || year < 2000 || year > 2100) {
      const err = new Error('Parameter tahun tidak valid. Masukkan tahun antara 2000-2100.');
      err.statusCode = 400;
      throw err;
    }

    const result = await P3kCsvImportService.getRetirementReport({ year, page, limit, search });

    res.status(200).json({
      success: true,
      message: `Berhasil mengambil laporan pensiun tahun ${year}`,
      data: result.data,
      byUnitKerja: result.byUnitKerja,
      meta: result.meta
    });
  });
}
