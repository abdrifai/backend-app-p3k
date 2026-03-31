import { PerpanjanganService } from './perpanjangan.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { createUsulanSchema, rejectUsulanSchema, createTemplateSchema } from './perpanjangan.validation.js';

export class PerpanjanganController {
  // ===== TEMPLATE =====

  /**
   * @swagger
   * /api/v1/perpanjangan/templates:
   *   get:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Ambil semua template kontrak
   *     responses:
   *       200:
   *         description: Berhasil
   */
  static getTemplates = asyncHandler(async (req, res) => {
    const templates = await PerpanjanganService.getAllTemplates();
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar template',
      data: templates
    });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/templates:
   *   post:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Upload template kontrak baru (Word .docx)
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               nama:
   *                 type: string
   *               deskripsi:
   *                 type: string
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       201:
   *         description: Template berhasil diupload
   */
  static createTemplate = asyncHandler(async (req, res) => {
    const { error, value } = createTemplateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message, data: null });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File template Word (.docx) wajib diupload', data: null });
    }

    const fileUrl = `/uploads/template-kontrak/${req.file.filename}`;
    const result = await PerpanjanganService.createTemplate({
      ...value,
      fileUrl,
      namaFile: req.file.originalname
    });

    res.status(201).json({
      success: true,
      message: 'Template kontrak berhasil diupload.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/templates/{id}:
   *   delete:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Hapus template kontrak
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Template berhasil dihapus
   */
  static deleteTemplate = asyncHandler(async (req, res) => {
    await PerpanjanganService.deleteTemplate(req.params.id);
    res.status(200).json({ success: true, message: 'Template berhasil dihapus.', data: null });
  });

  // ===== USULAN =====

  /**
   * @swagger
   * /api/v1/perpanjangan/usulan:
   *   get:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Ambil semua usulan perpanjangan
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Berhasil
   */
  static getAllUsulan = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const search = req.query.search || '';

    const isAdmin = ['admin', 'ADMIN', 'Admin'].includes(req.user?.role);
    const result = await PerpanjanganService.getAllUsulan({ 
      page, 
      limit, 
      status, 
      search,
      userId: req.user?.id,
      isAdmin
    });
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data usulan perpanjangan',
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/usulan:
   *   post:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Buat usulan perpanjangan kontrak baru
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nipBaru: { type: string }
   *               tanggalMulai: { type: string }
   *               tanggalSelesai: { type: string }
   *               keterangan: { type: string }
   *               templateKontrakId: { type: string }
   *               nomorKontrak: { type: string }
   *     responses:
   *       201:
   *         description: Usulan berhasil dibuat
   */
  static createUsulan = asyncHandler(async (req, res) => {
    const { error, value } = createUsulanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message, data: null });
    }

    const result = await PerpanjanganService.createUsulan(value, req.user?.id);
    res.status(201).json({
      success: true,
      message: 'Usulan perpanjangan kontrak berhasil dibuat.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/usulan/{id}:
   *   put:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Edit usulan yang ditolak (dan kembalikan ke status PENDING)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               tanggalMulai: { type: string }
   *               tanggalSelesai: { type: string }
   *               keterangan: { type: string }
   *               templateKontrakId: { type: string }
   *               nomorKontrak: { type: string }
   *     responses:
   *       200:
   *         description: Usulan berhasil di-update
   */
  static updateUsulan = asyncHandler(async (req, res) => {
    const result = await PerpanjanganService.updateUsulan(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Usulan berhasil diperbarui dan diajukan kembali.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/usulan/{id}/approve:
   *   post:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Setujui usulan (generate dokumen kontrak)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Usulan disetujui & dokumen di-generate
   */
  static approveUsulan = asyncHandler(async (req, res) => {
    const result = await PerpanjanganService.approveUsulan(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Usulan perpanjangan kontrak disetujui.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/usulan/{id}/reject:
   *   post:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Tolak usulan perpanjangan
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               alasanPenolakan: { type: string }
   *     responses:
   *       200:
   *         description: Usulan ditolak
   */
  static rejectUsulan = asyncHandler(async (req, res) => {
    const { error, value } = rejectUsulanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message, data: null });
    }
    const result = await PerpanjanganService.rejectUsulan(req.params.id, value.alasanPenolakan);
    res.status(200).json({
      success: true,
      message: 'Usulan perpanjangan kontrak ditolak.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/usulan/{id}/generate:
   *   post:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Generate ulang dokumen kontrak dari template
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Dokumen berhasil di-generate
   */
  static generateDocument = asyncHandler(async (req, res) => {
    const fileUrl = await PerpanjanganService.generateDocument(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Dokumen kontrak berhasil di-generate.',
      data: { fileUrl }
    });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/usulan/{id}/preview:
   *   get:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Lihat preview data variabel yang akan masuk ke template
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Preview data berhasil diambil
   */
  static getPreview = asyncHandler(async (req, res) => {
    const data = await PerpanjanganService.getPreviewData(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Data preview usulan berhasil diambil.',
      data
    });
  });


  /**
   * @swagger
   * /api/v1/perpanjangan/usulan/{id}:
   *   delete:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Hapus usulan
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Usulan berhasil dihapus
   */
  static deleteUsulan = asyncHandler(async (req, res) => {
    await PerpanjanganService.deleteUsulan(req.params.id);
    res.status(200).json({ success: true, message: 'Usulan berhasil dihapus.', data: null });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/usulan/{id}/approved:
   *   delete:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Hapus usulan disetujui beserta filenya (Admin Only)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Usulan disetujui berhasil dihapus beserta filenya
   */
  static deleteApprovedUsulan = asyncHandler(async (req, res) => {
    await PerpanjanganService.deleteApprovedUsulan(req.params.id);
    res.status(200).json({ success: true, message: 'Usulan disetujui beserta dokumen kontraknya berhasil dihapus.', data: null });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/usulan/{id}/upload-final:
   *   post:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Upload dokumen PDF final yang sudah ditandatangani
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Berhasil upload dan status menjadi SELESAI
   */
  static uploadFinalDocument = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File PDF final wajib diupload', data: null });
    }

    const fileUrl = `/uploads/final-pk/${req.file.filename}`;
    const result = await PerpanjanganService.uploadFinalDocument(req.params.id, fileUrl);

    res.status(200).json({
      success: true,
      message: 'Dokumen final berhasil diunggah, status menjadi SELESAI.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/usulan/{id}/srikandi:
   *   post:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Proses usulan ke tahap Upload Srikandi (Manual)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Status berhasil diubah ke UPLOAD_SRIKANDI
   */
  static processToSrikandi = asyncHandler(async (req, res) => {
    const result = await PerpanjanganService.processToSrikandi(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Usulan berhasil diproses ke tahap Upload Srikandi.',
      data: result
    });
  });

  /**
   * @swagger
   * /api/v1/perpanjangan/next-contract-number/{nipBaru}:
   *   get:
   *     tags: [Perpanjangan Kontrak]
   *     summary: Ambil nomor kontrak otomatis berikutnya untuk pegawai tertentu
   *     parameters:
   *       - in: path
   *         name: nipBaru
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Berhasil mendapatkan nomor kontrak berikutnya
   */
  static getNextContractNumber = asyncHandler(async (req, res) => {
    const result = await PerpanjanganService.getNextContractNumber(req.params.nipBaru);
    res.status(200).json({
      success: true,
      message: 'Berhasil mendapatkan nomor kontrak berikutnya.',
      data: result
    });
  });
}
