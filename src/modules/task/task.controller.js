import taskService from './task.service.js';
import { autoAssignSchema, manualAssignSchema, completeTaskSchema, assignByPegawaiSchema, unassignPegawaiSchema } from './task.validation.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

class TaskController {
  
  autoAssign = asyncHandler(async (req, res) => {
    const { error, value } = autoAssignSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const result = await taskService.autoAssign(value.userIds, value.amountPerUser, value.kegiatan);
    
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

    const result = await taskService.manualAssign(value.assignments, value.kegiatan);

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

    const fileData = req.file ? {
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/sk-cpns/${req.file.filename}`
    } : null;

    const data = await taskService.completeTask(taskId, value, userId, fileData);

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

  getDashboardStats = asyncHandler(async (req, res) => {
    const kegiatan = req.query.kegiatan || '';
    const result = await taskService.getDashboardStats(kegiatan);

    res.status(200).json({
      success: true,
      message: 'Berhasil mendapatkan statistik dashboard tugas peremajaan',
      data: result
    });
  });

  getDashboardDetail = asyncHandler(async (req, res) => {
    const result = await taskService.getDashboardDetail(req.query);

    res.status(200).json({
      success: true,
      message: 'Berhasil mendapatkan rincian data dashboard tugas peremajaan',
      ...result
    });
  });

  getUnassignedCount = asyncHandler(async (req, res) => {
    const kegiatan = req.query.kegiatan || '';
    const result = await taskService.getUnassignedCount(kegiatan);

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

  /**
   * @swagger
   * /api/tasks/pegawai-list:
   *   get:
   *     tags: [Tasks]
   *     summary: Cari data pegawai dan status penugasan tugas peremajaan
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
   *       - in: query
   *         name: statusPenugasan
   *         schema:
   *           type: string
   *           enum: [ALL, UNASSIGNED, ASSIGNED, COMPLETED]
   *       - in: query
   *         name: kegiatan
   *         schema:
   *           type: string
   *       - in: query
   *         name: unorIndukId
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Berhasil mengambil daftar pegawai untuk penugasan
   */
  searchPegawai = asyncHandler(async (req, res) => {
    const result = await taskService.searchPegawaiForTask(req.query);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar pegawai untuk penugasan task',
      ...result
    });
  });

  /**
   * @swagger
   * /api/tasks/assign/by-pegawai:
   *   post:
   *     tags: [Tasks]
   *     summary: Tugaskan pegawai tertentu ke user verifikator
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [dataP3kIds, userId]
   *             properties:
   *               dataP3kIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               userId:
   *                 type: string
   *               kegiatan:
   *                 type: string
   *     responses:
   *       200:
   *         description: Berhasil menugaskan task
   */
  assignByPegawai = asyncHandler(async (req, res) => {
    const { error, value } = assignByPegawaiSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const result = await taskService.assignByPegawai(value.dataP3kIds, value.userId, value.kegiatan);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { totalAssigned: result.totalAssigned }
    });
  });

  /**
   * @swagger
   * /api/tasks/unassign-pegawai:
   *   post:
   *     tags: [Tasks]
   *     summary: Tarik tugas peremajaan dari pegawai tertentu
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               dataP3kIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               taskIds:
   *                 type: array
   *                 items:
   *                   type: string
   *               kegiatan:
   *                 type: string
   *     responses:
   *       200:
   *         description: Berhasil menarik tugas
   */
  unassignPegawai = asyncHandler(async (req, res) => {
    const { error, value } = unassignPegawaiSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const result = await taskService.unassignPegawai(value);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { totalRevoked: result.totalRevoked }
    });
  });
}

export default new TaskController();
