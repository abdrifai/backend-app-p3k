import express from 'express';
import { PerpanjanganController } from './perpanjangan.controller.js';
import { uploadTemplateKontrak, uploadUsulanFinal } from '../../middlewares/upload.middleware.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';
import KinerjaSnapshotService from './kinerja-snapshot.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
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
router.get('/dashboard-stats', authenticate, PerpanjanganController.getDashboardStats);
router.get('/kinerja-harian', authenticate, PerpanjanganController.getKinerjaHarian);

/**
 * POST /api/v1/perpanjangan/kinerja-snapshot
 * Manual trigger snapshot rekap kinerja untuk tanggal tertentu.
 * Body: { date: "YYYY-MM-DD" } — opsional, default kemarin.
 */
router.post('/kinerja-snapshot', authenticate, asyncHandler(async (req, res) => {
  const { date } = req.body;
  let targetDate = date;

  if (!targetDate) {
    // default: hari kemarin
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    targetDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  }

  const result = await KinerjaSnapshotService.snapshotForDate(targetDate);
  return res.json({
    success: true,
    message: `Snapshot rekap kinerja untuk tanggal ${targetDate} berhasil disimpan.`,
    data: result
  });
}));

export const perpanjanganRoutes = router;
