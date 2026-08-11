import activityLogService from './activityLog.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

class ActivityLogController {
  /**
   * @swagger
   * /api/v1/activity-logs:
   *   get:
   *     summary: Ambil daftar log aktivitas sistem (dengan filter NIP PPPK, user, aksi, dll)
   *     tags: [Activity Logs]
   *     security:
   *       - bearerAuth: []
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
   *         name: nip
   *         schema:
   *           type: string
   *         description: Pencarian berdasarkan NIP PPPK
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Pencarian umum teks
   *       - in: query
   *         name: action
   *         schema:
   *           type: string
   *         description: Filter tipe aksi (UPDATE, COMPLETE_TASK, DELETE_USULAN, dll)
   *       - in: query
   *         name: entityType
   *         schema:
   *           type: string
   *         description: Filter tipe entitas (DataP3k, TaskPeremajaan, TaskUsulan, UsulanPerpanjangan)
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: Filter berdasarkan ID user pelaku
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter tanggal awal (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter tanggal akhir (YYYY-MM-DD)
   *     responses:
   *       200:
   *         description: Log aktivitas berhasil diambil
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden (Admin only)
   *       500:
   *         description: Internal server error
   */
  getLogs = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const filters = {
      nip: req.query.nip,
      search: req.query.search,
      action: req.query.action,
      entityType: req.query.entityType,
      entityId: req.query.entityId,
      userId: req.query.userId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await activityLogService.getLogs(page, limit, filters);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Log aktivitas berhasil diambil.'
    });
  });

  /**
   * @swagger
   * /api/v1/activity-logs/settings/status:
   *   get:
   *     summary: Ambil status aktif/tidaknya pencatatan activity logging
   *     tags: [Activity Logs]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Status logging berhasil diambil
   */
  getLoggingStatus = asyncHandler(async (req, res) => {
    const status = await activityLogService.getLoggingStatus();
    res.status(200).json({
      success: true,
      data: { isEnabled: status },
      message: 'Status logging berhasil diambil.'
    });
  });

  /**
   * @swagger
   * /api/v1/activity-logs/settings/toggle:
   *   patch:
   *     summary: Aktifkan atau nonaktifkan pencatatan log aktivitas
   *     tags: [Activity Logs]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               enabled:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Status logging berhasil diubah
   */
  toggleLogging = asyncHandler(async (req, res) => {
    const { enabled } = req.body;
    const newStatus = await activityLogService.toggleLogging(enabled);
    res.status(200).json({
      success: true,
      data: { isEnabled: newStatus },
      message: `Logging berhasil di-${newStatus ? 'aktifkan' : 'nonaktifkan'}.`
    });
  });

  /**
   * @swagger
   * /api/v1/activity-logs/archive:
   *   post:
   *     summary: Arsipkan log aktivitas lama ke tabel arsip
   *     tags: [Activity Logs]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               daysOlder:
   *                 type: integer
   *                 default: 30
   *     responses:
   *       200:
   *         description: Log aktivitas berhasil diarsipkan
   */
  archiveOldLogs = asyncHandler(async (req, res) => {
    const daysOlder = parseInt(req.body.daysOlder) || 30;
    const result = await activityLogService.archiveLogsByDays(daysOlder);
    
    res.status(200).json({
      success: true,
      data: result,
      message: result.message
    });
  });
}

export default new ActivityLogController();
