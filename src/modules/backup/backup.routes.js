import express from 'express';
import backupController from './backup.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Admin only
router.use(authenticate);
router.use(authorize('admin'));

// ── Existing routes ──────────────────────────────────────────────────────────
router.get('/stats',    backupController.getStats);
router.post('/sql',     backupController.downloadSql);
router.post('/archive', backupController.downloadArchive);

// ── Backup otomatis: trigger, history, download, delete ──────────────────────
router.post('/trigger',              backupController.triggerBackup);
router.get('/history',               backupController.getHistory);
router.get('/download/:filename',    backupController.downloadBackupFile);
router.delete('/delete/:filename',   backupController.deleteBackup);

export default router;
