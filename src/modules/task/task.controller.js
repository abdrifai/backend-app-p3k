import taskService from './task.service.js';
import { autoAssignSchema, manualAssignSchema, completeTaskSchema } from './task.validation.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

class TaskController {
  
  autoAssign = asyncHandler(async (req, res) => {
    const { error, value } = autoAssignSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const result = await taskService.autoAssign(value.userIds, value.amountPerUser);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: { totalAssigned: result.totalAssigned }
    });
  });

  manualAssign = asyncHandler(async (req, res) => {
    const { error, value } = manualAssignSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const result = await taskService.manualAssign(value.assignments);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { totalAssigned: result.totalAssigned }
    });
  });

  /**
   * Get tasks assigned to current logged in user
   */
  getMyTasks = asyncHandler(async (req, res) => {
    // req.user logic should be mapped in auth store/middleware
    // Assuming authMiddleware puts user inside req.user
    const userId = req.user.id;
    const result = await taskService.getMyTasks(userId, req.query);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil tugas',
      ...result
    });
  });

  /**
   * Complete task
   */
  completeTask = asyncHandler(async (req, res) => {
    const taskId = req.params.id;
    const userId = req.user.id;
    
    const { error, value } = completeTaskSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const data = await taskService.completeTask(taskId, value, userId);

    res.status(200).json({
      success: true,
      message: 'Tugas berhasil diselesaikan',
      data
    });
  });

  getReport = asyncHandler(async (req, res) => {
    const result = await taskService.getReport();

    res.status(200).json({
      success: true,
      message: 'Berhasil mendapatkan laporan tugas',
      data: result
    });
  });
  getUnassignedCount = asyncHandler(async (req, res) => {
    const result = await taskService.getUnassignedCount();

    res.status(200).json({
      success: true,
      message: 'Berhasil mendapatkan jumlah data belum dibagi',
      data: result
    });
  });
  
  resetTasks = asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const result = await taskService.resetTasks(userId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: { totalRevoked: result.totalRevoked }
    });
  });

  resetAllTasks = asyncHandler(async (req, res) => {
    const result = await taskService.resetAllTasks();
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: { totalRevoked: result.totalRevoked }
    });
  });
}

export default new TaskController();
