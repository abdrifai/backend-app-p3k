import express from 'express';
import { RefJenisPensiunController } from './ref-jenis-pensiun.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', RefJenisPensiunController.getAll);
router.get('/:id', RefJenisPensiunController.getById);
router.post('/', authorize('admin', 'admin_utama', 'superadmin', 'pensiun'), RefJenisPensiunController.create);
router.put('/:id', authorize('admin', 'admin_utama', 'superadmin', 'pensiun'), RefJenisPensiunController.update);
router.delete('/:id', authorize('admin', 'admin_utama', 'superadmin', 'pensiun'), RefJenisPensiunController.delete);

export const refJenisPensiunRoutes = router;
