'use strict';

import path from 'path';
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
   *     summary: Download arsip folder uploads (final-pk & pensiun-sk) as ZIP
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
   *                   enum: [final-pk, pensiun-sk]
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
    const folders  = Array.isArray(req.body?.folders) ? req.body.folders : ['final-pk', 'pensiun-sk'];
    const zipBuf   = await backupService.generateArchiveZip(folders);
    const filename = `backup_arsip_p3k_${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(zipBuf);
  });

  /**
   * @swagger
   * /api/backup/trigger:
   *   post:
   *     summary: Manual trigger backup database ke disk
   *     description: Menjalankan mysqldump dan menyimpan file .sql ke folder backupdb/ di server.
   *     tags: [Backup]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Backup berhasil dibuat
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Backup database berhasil dibuat
   *                 data:
   *                   type: object
   *                   properties:
   *                     filename:
   *                       type: string
   *                       example: P3K_DB_2026-08-27_00-00-00.sql
   *                     sizeBytes:
   *                       type: integer
   *                       example: 1048576
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *       500:
   *         description: Gagal menjalankan backup
   */
  triggerBackup = asyncHandler(async (req, res) => {
    const result = await backupService.runScheduledBackup();
    res.status(201).json({
      success: true,
      message: 'Backup database berhasil dibuat',
      data: result,
    });
  });

  /**
   * @swagger
   * /api/backup/history:
   *   get:
   *     summary: Daftar semua file backup yang tersimpan di server
   *     description: Mengembalikan list file .sql di folder backupdb/ beserta metadata (nama, ukuran, tanggal).
   *     tags: [Backup]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Daftar riwayat backup
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Riwayat backup
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       filename:
   *                         type: string
   *                       sizeBytes:
   *                         type: integer
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   */
  getHistory = asyncHandler(async (req, res) => {
    const history = backupService.getBackupHistory();
    res.status(200).json({
      success: true,
      message: 'Riwayat backup',
      data: history,
    });
  });

  /**
   * @swagger
   * /api/backup/download/{filename}:
   *   get:
   *     summary: Download file backup tertentu
   *     description: Mendownload file .sql backup berdasarkan nama file.
   *     tags: [Backup]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: filename
   *         required: true
   *         schema:
   *           type: string
   *         description: Nama file backup (contoh P3K_DB_2026-08-27_00-00-00.sql)
   *     responses:
   *       200:
   *         description: File download
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: File tidak ditemukan
   */
  downloadBackupFile = asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const filePath = backupService.getBackupFilePath(filename);
    const basename = path.basename(filePath);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${basename}"`);
    res.status(200).sendFile(filePath);
  });

  /**
   * @swagger
   * /api/backup/delete/{filename}:
   *   delete:
   *     summary: Hapus file backup tertentu dari server
   *     description: Menghapus file .sql backup berdasarkan nama file dari folder backupdb/.
   *     tags: [Backup]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: filename
   *         required: true
   *         schema:
   *           type: string
   *         description: Nama file backup yang akan dihapus
   *     responses:
   *       200:
   *         description: File berhasil dihapus
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: File backup berhasil dihapus
   *                 data:
   *                   type: object
   *                   properties:
   *                     filename:
   *                       type: string
   *                     deleted:
   *                       type: boolean
   *       404:
   *         description: File tidak ditemukan
   */
  deleteBackup = asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const result = backupService.deleteBackupFile(filename);
    res.status(200).json({
      success: true,
      message: 'File backup berhasil dihapus',
      data: result,
    });
  });
}

export default new BackupController();
