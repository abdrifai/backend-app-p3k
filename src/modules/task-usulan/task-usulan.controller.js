import taskUsulanService from './task-usulan.service.js';
import { autoAssignSchema, manualAssignSchema, completeTaskSchema } from './task-usulan.validation.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

class TaskUsulanController {
  
  autoAssign = asyncHandler(async (req, res) => {
    const { error, value } = autoAssignSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const { userIds, amountPerUser, tmtFilters } = value;
    const result = await taskUsulanService.autoAssign({ userIds, amountPerUser, tmtFilters });
    
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

    const { assignments, tmtFilters } = value;
    const result = await taskUsulanService.manualAssign({ assignments, tmtFilters });

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
    const userId = req.user.id;
    const result = await taskUsulanService.getMyTasks(userId, req.query);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil tugas usulan',
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

    const data = await taskUsulanService.completeTask(taskId, value, userId);

    res.status(200).json({
      success: true,
      message: 'Tugas usulan berhasil diselesaikan',
      data
    });
  });

  getReport = asyncHandler(async (req, res) => {
    const result = await taskUsulanService.getReport();

    res.status(200).json({
      success: true,
      message: 'Berhasil mendapatkan laporan tugas usulan',
      data: result
    });
  });
  
  resetTasks = asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const result = await taskUsulanService.resetTasks(userId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: { totalRevoked: result.totalRevoked }
    });
  });

  resetAllTasks = asyncHandler(async (req, res) => {
    const result = await taskUsulanService.resetAllTasks();
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: { totalRevoked: result.totalRevoked }
    });
  });

  getMyTaskStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await taskUsulanService.getMyTaskStats(userId);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil statistik tugas usulan',
      data: result
    });
  });

  getUnassignedStats = asyncHandler(async (req, res) => {
    const result = await taskUsulanService.getUnassignedStats();

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil statistik data belum dibagi (Task Usulan)',
      data: result
    });
  });

  /**
   * @swagger
   * /api/tasks-usulan/search-assigned:
   *   get:
   *     tags: [TasksUsulan]
   *     summary: Search all assigned tasks (Task Usulan)
   *     security:
   *       - bearerAuth: []
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
   *         description: Berhasil mencari tugas usulan terbagi
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  searchAssignedTasks = asyncHandler(async (req, res) => {
    const result = await taskUsulanService.searchAssignedTasks(req.query);

    res.status(200).json({
      success: true,
      message: 'Berhasil mencari tugas usulan terbagi',
      ...result
    });
  });
}

export default new TaskUsulanController();
