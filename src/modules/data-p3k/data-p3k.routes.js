import express from 'express';
import { DataP3kController } from './data-p3k.controller.js';
import { uploadPensiunSk } from '../../middlewares/upload.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/sync', DataP3kController.syncFromImport);
router.post('/set-pensiun', uploadPensiunSk.single('file'), DataP3kController.setPensiun);
router.post('/set-pension', uploadPensiunSk.single('file'), DataP3kController.setPensiun);
router.put('/update-pensiun', uploadPensiunSk.single('file'), DataP3kController.updatePensiun);
router.put('/update-pension', uploadPensiunSk.single('file'), DataP3kController.updatePensiun);
router.post('/revert-pensiun', DataP3kController.revertPensiun);
router.post('/revert-pension', DataP3kController.revertPensiun);
router.get('/pensiun', DataP3kController.getAllPensiun);
router.get('/pensioned', DataP3kController.getAllPensiun);
router.get('/statistics', DataP3kController.getStatistics);
router.get('/retirement', DataP3kController.getRetirementReport);
router.get('/differences', DataP3kController.getDifferences);
router.get('/', DataP3kController.getAllDataP3k);
router.put('/:nipBaru', DataP3kController.updateData);

export const dataP3kRoutes = router;
