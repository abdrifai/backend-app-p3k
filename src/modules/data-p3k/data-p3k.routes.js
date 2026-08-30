import express from 'express';
import { DataP3kController } from './data-p3k.controller.js';
import { uploadPensiunSk } from '../../middlewares/upload.middleware.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

const pensiunAuth = authorize('admin', 'pensiun', 'operator_pensiun');

router.post('/sync', DataP3kController.syncFromImport);
router.post('/set-pensiun', pensiunAuth, uploadPensiunSk.single('file'), DataP3kController.setPensiun);
router.post('/set-pension', pensiunAuth, uploadPensiunSk.single('file'), DataP3kController.setPensiun);
router.put('/update-pensiun', pensiunAuth, uploadPensiunSk.single('file'), DataP3kController.updatePensiun);
router.put('/update-pension', pensiunAuth, uploadPensiunSk.single('file'), DataP3kController.updatePensiun);
router.post('/revert-pensiun', pensiunAuth, DataP3kController.revertPensiun);
router.post('/revert-pension', pensiunAuth, DataP3kController.revertPensiun);
router.get('/pensiun', DataP3kController.getAllPensiun);
router.get('/pensioned', DataP3kController.getAllPensiun);
router.get('/statistics', DataP3kController.getStatistics);
router.get('/retirement', DataP3kController.getRetirementReport);
router.get('/differences', DataP3kController.getDifferences);
router.get('/mapping-unor', DataP3kController.getMappingUnor);
router.patch('/:id/mapping-unor', DataP3kController.updateMappingUnor);
router.post('/bulk-mapping-unor', DataP3kController.bulkUpdateMappingUnor);
router.get('/', DataP3kController.getAllDataP3k);
router.get('/:nipBaru', DataP3kController.getByNipBaru);
router.put('/:nipBaru', DataP3kController.updateData);

export const dataP3kRoutes = router;
