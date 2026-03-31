import { Router } from 'express';
import taskUsulanController from './task-usulan.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// Protect all routes
router.use(authenticate);

// ====== USER ROUTES ======
router.get('/my-tasks', taskUsulanController.getMyTasks);
router.get('/my-stats', taskUsulanController.getMyTaskStats);
router.put('/:id/complete', taskUsulanController.completeTask);
router.get('/report', taskUsulanController.getReport);

// ====== ADMIN ROUTES ======
router.use(authorize('admin'));
router.post('/assign/auto', taskUsulanController.autoAssign);
router.post('/assign/manual', taskUsulanController.manualAssign);
router.post('/reset-all', taskUsulanController.resetAllTasks);
router.get('/unassigned-stats', taskUsulanController.getUnassignedStats);
router.post('/reset/:userId', taskUsulanController.resetTasks);

export default router;
