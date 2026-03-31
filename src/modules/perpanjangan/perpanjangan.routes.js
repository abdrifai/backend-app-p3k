import express from 'express';
import { PerpanjanganController } from './perpanjangan.controller.js';
import { uploadTemplateKontrak, uploadUsulanFinal } from '../../middlewares/upload.middleware.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
const router = express.Router();

// Templates
router.get('/templates', PerpanjanganController.getTemplates);
router.post('/templates', uploadTemplateKontrak.single('file'), PerpanjanganController.createTemplate);
router.delete('/templates/:id', PerpanjanganController.deleteTemplate);

router.get('/usulan', authenticate, PerpanjanganController.getAllUsulan);
router.get('/usulan/:id/preview', authenticate, PerpanjanganController.getPreview);
router.post('/usulan', authenticate, PerpanjanganController.createUsulan);
router.put('/usulan/:id', authenticate, PerpanjanganController.updateUsulan);
router.post('/usulan/:id/approve', PerpanjanganController.approveUsulan);
router.post('/usulan/:id/reject', PerpanjanganController.rejectUsulan);
router.post('/usulan/:id/generate', PerpanjanganController.generateDocument);
router.post('/usulan/:id/srikandi', authenticate, PerpanjanganController.processToSrikandi);
router.post('/usulan/:id/upload-final', authenticate, uploadUsulanFinal.single('file'), PerpanjanganController.uploadFinalDocument);
router.delete('/usulan/:id', PerpanjanganController.deleteUsulan);
router.delete('/usulan/:id/approved', authenticate, authorize('admin', 'ADMIN', 'Admin'), PerpanjanganController.deleteApprovedUsulan);
router.get('/next-contract-number/:nipBaru', authenticate, PerpanjanganController.getNextContractNumber);

export const perpanjanganRoutes = router;
