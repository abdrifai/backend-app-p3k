import { Router } from 'express';
import taskController from './task.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import { uploadSkCpns } from '../../middlewares/upload.middleware.js';

const router = Router();

// Protect all routes
router.use(authenticate);

// ====== USER ROUTES ======
router.get('/my-tasks', taskController.getMyTasks);
router.put('/:id/complete', uploadSkCpns.single('fileSkCpns'), taskController.completeTask);
router.get('/report', taskController.getReport);

// ====== ADMIN ROUTES ======
router.use(authorize('admin'));
router.post('/assign/auto', taskController.autoAssign);
router.post('/assign/manual', taskController.manualAssign);
router.post('/reset-all', taskController.resetAllTasks);
router.get('/unassigned-count', taskController.getUnassignedCount);
router.post('/reset/:userId', taskController.resetTasks);

export default router;
