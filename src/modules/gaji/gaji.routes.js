import express from 'express';
import { GajiController } from './gaji.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', GajiController.getAll);
router.post('/', GajiController.create);
router.get('/lookup', GajiController.lookup);
router.delete('/:id', GajiController.delete);

export default router;
