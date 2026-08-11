import express from 'express';
import kegiatanController from './kegiatan.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Protect all routes: admin only
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', kegiatanController.list);
router.post('/', kegiatanController.create);
router.put('/:id', kegiatanController.update);
router.delete('/:id', kegiatanController.delete);

export default router;
