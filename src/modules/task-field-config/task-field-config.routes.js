import { Router } from 'express';
import taskFieldConfigController from './task-field-config.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// GET: all users can read (admin sees all, user sees active only)
router.get('/', taskFieldConfigController.getAll);

// PUT: admin only - batch update
router.put('/', authorize('admin'), taskFieldConfigController.batchUpdate);

export default router;
