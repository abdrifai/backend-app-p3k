import express from 'express';
import multer from 'multer';
import { P3kParuhWaktuController } from './p3k-paruh-waktu.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// All endpoints require authentication
router.use(authenticate);

router.post('/import', upload.single('file'), P3kParuhWaktuController.importCsv);
router.post('/sync-master', P3kParuhWaktuController.syncToMaster);
router.get('/master', P3kParuhWaktuController.getMasterData);
router.get('/master/:id', P3kParuhWaktuController.getMasterById);
router.put('/mapping-unor', P3kParuhWaktuController.updateMappingUnor);
router.put('/bulk-mapping-unor', P3kParuhWaktuController.bulkUpdateMappingUnor);
router.get('/filters', P3kParuhWaktuController.getFilters);
router.get('/stats', P3kParuhWaktuController.getStats);
router.delete('/clear', P3kParuhWaktuController.clearAll);
router.get('/:id', P3kParuhWaktuController.getById);
router.delete('/:id', P3kParuhWaktuController.deleteById);
router.get('/', P3kParuhWaktuController.getData);

export const p3kParuhWaktuRoutes = router;

