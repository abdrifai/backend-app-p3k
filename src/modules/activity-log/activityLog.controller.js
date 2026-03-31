import activityLogService from './activityLog.service.js';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class ActivityLogController {
  getLogs = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const filters = {
      userId: req.query.userId,
      entityType: req.query.entityType,
      entityId: req.query.entityId,
    };

    const result = await activityLogService.getLogs(page, limit, filters);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Log aktivitas berhasil diambil.'
    });
  });

  getLoggingStatus = asyncHandler(async (req, res) => {
    const status = await activityLogService.getLoggingStatus();
    res.status(200).json({
      success: true,
      data: { isEnabled: status },
      message: 'Status logging berhasil diambil.'
    });
  });

  toggleLogging = asyncHandler(async (req, res) => {
    const { enabled } = req.body;
    const newStatus = await activityLogService.toggleLogging(enabled);
    res.status(200).json({
      success: true,
      data: { isEnabled: newStatus },
      message: `Logging berhasil di-${newStatus ? 'aktifkan' : 'nonaktifkan'}.`
    });
  });

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
