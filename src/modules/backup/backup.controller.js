'use strict';

import backupService from './backup.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

class BackupController {
  /**
   * @swagger
   * /api/backup/stats:
   *   get:
   *     summary: Get database & archive statistics
   *     tags: [Backup]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Stats
   */
  getStats = asyncHandler(async (req, res) => {
    const [dbStats, archiveStats] = await Promise.all([
      backupService.getStats(),
      backupService.getArchiveStats(),
    ]);
    res.status(200).json({
      success: true,
      message: 'Statistik backup',
      data:    { db: dbStats, archive: archiveStats },
    });
  });

  /**
   * @swagger
   * /api/backup/sql:
   *   post:
   *     summary: Download full database backup as SQL (mysqldump)
   *     description: Menghasilkan file .sql via mysqldump yang dapat langsung digunakan untuk restore.
   *     tags: [Backup]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: SQL file download
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *       500:
   *         description: mysqldump failed
   */
  downloadSql = asyncHandler(async (req, res) => {
    const sql      = await backupService.generateSql();
    const filename = `backup_db_p3k_${new Date().toISOString().slice(0, 10)}.sql`;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(sql);
  });

  /**
   * @swagger
   * /api/backup/archive:
   *   post:
   *     summary: Download arsip folder uploads (final-pk & pension-sk) as ZIP
   *     tags: [Backup]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               folders:
   *                 type: array
   *                 items:
   *                   type: string
   *                   enum: [final-pk, pension-sk]
   *     responses:
   *       200:
   *         description: ZIP file download
   *         content:
   *           application/zip:
   *             schema:
   *               type: string
   *               format: binary
   */
  downloadArchive = asyncHandler(async (req, res) => {
    const folders  = Array.isArray(req.body?.folders) ? req.body.folders : ['final-pk', 'pension-sk'];
    const zipBuf   = await backupService.generateArchiveZip(folders);
    const filename = `backup_arsip_p3k_${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(zipBuf);
  });
}

export default new BackupController();
