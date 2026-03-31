import { DataP3kService } from './data-p3k.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { setPensionSchema, updatePensionSchema, revertPensionSchema, updateDataP3kSchema } from './data-p3k.validation.js';

export class DataP3kController {
  /**
   * @swagger
   * /api/v1/data-p3k/sync:
   *   post:
   *     tags: [Data P3K]
   *     summary: Sinkronisasi data dari CSV Import ke Data P3K utama
   *     responses:
   *       200:
   *         description: Sinkronisasi berhasil
   *       500:
   *         description: Server error
   */
  static syncFromImport = asyncHandler(async (req, res) => {
    const { syncedCount } = await DataP3kService.syncDataFromImport();

    res.status(200).json({
      success: true,
      message: `Berhasil menarik ${syncedCount} data baru ke Data P3K utama.`,
      data: { syncedCount }
    });
  });

  /**
   * @swagger
   * /api/v1/data-p3k:
   *   get:
   *     tags: [Data P3K]
   *     summary: Ambil semua data pegawai PPPK (utama)
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
   *         name: unitKerja
   *         schema:
   *           type: string
   *       - in: query
   *         name: statusPensiun
   *         schema:
   *           type: string
   *           enum: [AKTIF, PENSIUN]
   *       - in: query
   *         name: tmtCpns
   *         schema:
   *           type: string
   *       - in: query
   *         name: pendidikan
   *         schema:
   *           type: string
   *       - in: query
   *         name: golongan
   *         schema:
   *           type: string
   *       - in: query
   *         name: jenisJabatan
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Berhasil mengambil data P3K
   */
  static getAllDataP3k = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const unitKerja = req.query.unitKerja || '';
    const unitKerjaKosong = req.query.unitKerjaKosong === 'true';
    const unitKerjaAda = req.query.unitKerjaAda === 'true';
    const statusPensiun = req.query.statusPensiun || '';
    const tmtCpns = req.query.tmtCpns || '';
    const pendidikan = req.query.pendidikan || '';
    const golongan = req.query.golongan || '';
    const jenisJabatan = req.query.jenisJabatan || '';

    const result = await DataP3kService.getAllDataP3k({ page, limit, search, unitKerja, unitKerjaKosong, unitKerjaAda, statusPensiun, tmtCpns, pendidikan, golongan, jenisJabatan });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil Data P3K utama',
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * @swagger
   * /api/v1/data-p3k/retirement:
   *   get:
   *     tags: [Data P3K]
   *     summary: Laporan Pensiun P3K
   *     parameters:
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *         required: true
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
   *         description: Data pensiun berhasil diambil
   *       400:
   *         description: Parameter year tidak valid
   */
  static getRetirementReport = asyncHandler(async (req, res) => {
    const { year } = req.query;
    
    if (!year || isNaN(parseInt(year))) {
      return res.status(400).json({
        success: false,
        message: 'Parameter year (tahun pensiun) harus diisi dengan angka yang valid.',
        data: null
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const result = await DataP3kService.getRetirementReport({ year, page, limit, search });

    res.status(200).json({
      success: true,
      message: `Berhasil memuat laporan pensiun untuk tahun ${year}`,
      data: result.data,
      byUnitKerja: result.byUnitKerja,
      projections: result.projections,
      meta: result.meta
    });
  });

  /**
   * @swagger
   * /api/v1/data-p3k/statistics:
   *   get:
   *     tags: [Data P3K]
   *     summary: Statistik Data P3K Utama
   *     responses:
   *       200:
   *         description: Berhasil mengambil data statistik utama
   */
  static getStatistics = asyncHandler(async (req, res) => {
    const stats = await DataP3kService.getStatistics();

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil informasi statistik data P3K utama',
      data: stats
    });
  });

  /**
   * @swagger
   * /api/v1/data-p3k/differences:
   *   get:
   *     tags: [Data P3K]
   *     summary: Ambil data perbedaan Utama vs Import
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
   *     responses:
   *       200:
   *         description: Berhasil mengambil data perbedaan
   */
  static getDifferences = asyncHandler(async (req, res) => {
    const { page, limit, search } = req.query;

    const result = await DataP3kService.getDifferences({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search: search || ''
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil informasi perbedaan data',
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * @swagger
   * /api/v1/data-p3k/set-pension:
   *   post:
   *     tags: [Manajemen Pensiun]
   *     summary: Set status pegawai menjadi Pensiun
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               nipBaru:
   *                 type: string
   *               nomorSk:
   *                 type: string
   *               tanggalSk:
   *                 type: string
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Status pensiun berhasil diperbarui
   *       400:
   *         description: Validasi gagal
   *       404:
   *         description: Data P3K tidak ditemukan
   */
  static setPension = asyncHandler(async (req, res) => {
    const { error, value } = setPensionSchema.validate(req.body);
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
        message: 'File SK Pensiun PDF wajib diupload.',
        data: null
      });
    }

    const fileUrl = `/uploads/pension-sk/${req.file.filename}`;
    const result = await DataP3kService.setPension({ ...value, fileUrl });

    res.status(200).json({
      success: true,
      message: 'Status P3K berhasil diubah menjadi PENSIUN.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/data-p3k/pensioned:
   *   get:
   *     tags: [Manajemen Pensiun]
   *     summary: Daftar semua pegawai yang sudah pensiun
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
   *         description: Berhasil mengambil data pegawai pensiun
   */
  static getAllPensioned = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const result = await DataP3kService.getAllPensioned({ page, limit, search });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data pegawai pensiun',
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * @swagger
   * /api/v1/data-p3k/update-pension:
   *   put:
   *     tags: [Manajemen Pensiun]
   *     summary: Edit data SK Pensiun
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               nipBaru:
   *                 type: string
   *               nomorSk:
   *                 type: string
   *               tanggalSk:
   *                 type: string
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Data SK berhasil diperbarui
   *       400:
   *         description: Validasi gagal
   *       404:
   *         description: Data P3K tidak ditemukan
   */
  static updatePension = asyncHandler(async (req, res) => {
    const { error, value } = updatePensionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/pension-sk/${req.file.filename}`;
    }

    const result = await DataP3kService.updatePension({ ...value, fileUrl });

    res.status(200).json({
      success: true,
      message: 'Data SK Pensiun berhasil diperbarui.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/data-p3k/revert-pension:
   *   post:
   *     tags: [Manajemen Pensiun]
   *     summary: Batalkan status pensiun
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nipBaru:
   *                 type: string
   *     responses:
   *       200:
   *         description: Status berhasil dikembalikan
   *       400:
   *         description: Pegawai tidak berstatus PENSIUN
   *       404:
   *         description: Data P3K tidak ditemukan
   */
  static revertPension = asyncHandler(async (req, res) => {
    const { error, value } = revertPensionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const result = await DataP3kService.revertPension(value.nipBaru);

    res.status(200).json({
      success: true,
      message: 'Status pegawai berhasil dikembalikan menjadi AKTIF.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/data-p3k/{nipBaru}:
   *   put:
   *     tags: [Data P3K]
   *     summary: Update data P3K
   *     parameters:
   *       - in: path
   *         name: nipBaru
   *         schema:
   *           type: string
   *         required: true
   *         description: NIP Baru
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               unorInduk:
   *                 type: string
   *               unorNama:
   *                 type: string
   *               nama:
   *                 type: string
   *               gelarDepan:
   *                 type: string
   *               gelarBelakang:
   *                 type: string
   *     responses:
   *       200:
   *         description: Data P3K berhasil diperbarui
   *       400:
   *         description: Validasi gagal
   */
  static updateData = asyncHandler(async (req, res) => {
    const { nipBaru } = req.params;
    const { error, value } = updateDataP3kSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        data: null
      });
    }

    const result = await DataP3kService.updateData(nipBaru, value, req.user?.id);

    res.status(200).json({
      success: true,
      message: 'Data P3K berhasil diperbarui.',
      data: result
    });
  });
}
