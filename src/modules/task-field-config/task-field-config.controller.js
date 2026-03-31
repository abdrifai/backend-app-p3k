import taskFieldConfigService from './task-field-config.service.js';
import { batchUpdateSchema } from './task-field-config.validation.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

class TaskFieldConfigController {
  /**
   * GET /api/task-field-configs
   * Admin: returns all configs
   * User: returns only active configs
   */
  getAll = asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role?.toLowerCase() === 'admin';
    const activeOnly = req.query.activeOnly === 'true';

    const data = (isAdmin && !activeOnly)
      ? await taskFieldConfigService.getAll()
      : await taskFieldConfigService.getActive();

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil konfigurasi field',
      data,
    });
  });

  /**
   * PUT /api/task-field-configs
   * Admin only: batch update configs
   */
  batchUpdate = asyncHandler(async (req, res) => {
    const { error, value } = batchUpdateSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const data = await taskFieldConfigService.batchUpdate(value.configs);

    res.status(200).json({
      success: true,
      message: `Berhasil memperbarui ${data.length} konfigurasi field`,
      data,
    });
  });
}

export default new TaskFieldConfigController();
