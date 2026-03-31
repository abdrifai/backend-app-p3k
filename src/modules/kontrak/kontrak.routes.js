import express from 'express';
import { KontrakController } from './kontrak.controller.js';
import { uploadKontrakArsip } from '../../middlewares/upload.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/:nipBaru', KontrakController.getByNipBaru);
router.post('/', uploadKontrakArsip.single('file'), KontrakController.addContract);
router.put('/:id', uploadKontrakArsip.single('file'), KontrakController.updateContract);
router.delete('/:id', KontrakController.deleteContract);

export const kontrakRoutes = router;
