import express from 'express';
import { RefUnorController } from './ref-unor.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', RefUnorController.getAll);
router.post('/', RefUnorController.create);
router.put('/:id', RefUnorController.update);
router.delete('/:id', RefUnorController.delete);

export const refUnorRoutes = router;
