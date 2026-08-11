import express from 'express';
import backupController from './backup.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Admin only
router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats',    backupController.getStats);
router.post('/sql',     backupController.downloadSql);
router.post('/archive', backupController.downloadArchive);

export default router;
