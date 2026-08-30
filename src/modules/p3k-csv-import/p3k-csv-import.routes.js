import express from 'express';
import { P3kCsvImportController } from './p3k-csv-import.controller.js';
import { P3kCsvImportValidation } from './p3k-csv-import.validation.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post(
  '/',
  upload.single('file'),
  P3kCsvImportValidation.uploadCsv,
  P3kCsvImportController.uploadCsv
);

router.get('/last-import-time', P3kCsvImportController.getLastImportTime);
router.get('/statistics', P3kCsvImportController.getStatistics);
router.get('/retirement', P3kCsvImportController.getRetirementReport);
router.get('/compare-unor', P3kCsvImportController.getCompareUnorSummary);
router.get('/compare-unor/detail', P3kCsvImportController.getCompareUnorDetail);
router.get('/', P3kCsvImportController.getAllP3kData);

export const p3kCsvImportRoutes = router;
