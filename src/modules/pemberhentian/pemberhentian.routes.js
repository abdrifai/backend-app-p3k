import express from 'express';
import { PemberhentianController } from './pemberhentian.controller.js';
import { uploadPensiunSk } from '../../middlewares/upload.middleware.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

const pemberhentianAuth = authorize('admin', 'pensiun', 'operator_pensiun');

// Main endpoints
router.post('/set', pemberhentianAuth, uploadPensiunSk.single('file'), PemberhentianController.setPemberhentian);
router.post('/set-pensiun', pemberhentianAuth, uploadPensiunSk.single('file'), PemberhentianController.setPemberhentian);
router.post('/set-pemberhentian', pemberhentianAuth, uploadPensiunSk.single('file'), PemberhentianController.setPemberhentian);

router.put('/update', pemberhentianAuth, uploadPensiunSk.single('file'), PemberhentianController.updatePemberhentian);
router.put('/update-pensiun', pemberhentianAuth, uploadPensiunSk.single('file'), PemberhentianController.updatePemberhentian);
router.put('/update-pemberhentian', pemberhentianAuth, uploadPensiunSk.single('file'), PemberhentianController.updatePemberhentian);

router.post('/revert', pemberhentianAuth, PemberhentianController.revertPemberhentian);
router.post('/revert-pensiun', pemberhentianAuth, PemberhentianController.revertPemberhentian);
router.post('/revert-pemberhentian', pemberhentianAuth, PemberhentianController.revertPemberhentian);

router.get('/pensiun', PemberhentianController.getAllPemberhentian);
router.get('/', PemberhentianController.getAllPemberhentian);

export const pemberhentianRoutes = router;
