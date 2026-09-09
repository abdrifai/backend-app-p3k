import express from 'express';
import { KategoriMasalahController } from './kategori-masalah.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', KategoriMasalahController.getAll);
router.get('/:id', KategoriMasalahController.getById);
router.post('/', authorize('admin', 'admin_utama', 'superadmin'), KategoriMasalahController.create);
router.put('/:id', authorize('admin', 'admin_utama', 'superadmin'), KategoriMasalahController.update);
router.delete('/:id', authorize('admin', 'admin_utama', 'superadmin'), KategoriMasalahController.delete);

export const kategoriMasalahRoutes = router;
