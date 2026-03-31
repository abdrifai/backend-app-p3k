import express from 'express';
import { DataP3kController } from './data-p3k.controller.js';
import { uploadPensionSk } from '../../middlewares/upload.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/sync', DataP3kController.syncFromImport);
router.post('/set-pension', uploadPensionSk.single('file'), DataP3kController.setPension);
router.put('/update-pension', uploadPensionSk.single('file'), DataP3kController.updatePension);
router.post('/revert-pension', DataP3kController.revertPension);
router.get('/pensioned', DataP3kController.getAllPensioned);
router.get('/statistics', DataP3kController.getStatistics);
router.get('/retirement', DataP3kController.getRetirementReport);
router.get('/differences', DataP3kController.getDifferences);
router.get('/', DataP3kController.getAllDataP3k);
router.put('/:nipBaru', DataP3kController.updateData);

export const dataP3kRoutes = router;
