import express from 'express';
import { MasalahPegawaiController } from './masalah-pegawai.controller.js';
import { uploadMasalahLampiran } from '../../middlewares/upload.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

// List & Rekap
router.get('/', MasalahPegawaiController.getAll);
router.get('/rekap', MasalahPegawaiController.getRekap);
router.get('/generate-nomor', MasalahPegawaiController.generateNomor);
router.get('/export-excel', MasalahPegawaiController.exportExcel);
router.get('/pegawai/:dataP3kId', MasalahPegawaiController.getByPegawai);
router.get('/:id', MasalahPegawaiController.getById);

// Create & Update (Support up to 10 attachments)
router.post('/', uploadMasalahLampiran.array('lampiran', 10), MasalahPegawaiController.create);
router.put('/:id', uploadMasalahLampiran.array('lampiran', 10), MasalahPegawaiController.update);
router.post('/:id/tindak-lanjut', MasalahPegawaiController.addTindakLanjut);
router.delete('/lampiran/:lampiranId', MasalahPegawaiController.deleteLampiran);
router.delete('/:id', MasalahPegawaiController.delete);

export const masalahPegawaiRoutes = router;
