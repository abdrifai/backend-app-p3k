import { Router } from 'express';
import {
  listPejabat,
  createPejabat,
  updatePejabat,
  deletePejabat
} from './tte.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// CRUD Konfigurasi Pejabat hanya untuk admin
router.use(authenticate, authorize('admin'));

/**
 * @swagger
 * tags:
 *   name: Pejabat Penandatangan Admin
 *   description: Manajemen Pejabat Penandatangan Elektronik BSrE (Kepala BKPSDM, Sekda, Bupati)
 */

router.get('/', listPejabat);
router.post('/', createPejabat);
router.put('/:id', updatePejabat);
router.delete('/:id', deletePejabat);

export default router;
