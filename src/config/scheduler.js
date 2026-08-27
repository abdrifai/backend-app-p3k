'use strict';

import cron from 'node-cron';
import logger from './logger.js';
import backupService from '../modules/backup/backup.service.js';

/**
 * Inisialisasi scheduler untuk backup otomatis database.
 * Berjalan setiap hari pukul 00:00.
 */
const initScheduler = () => {
  // Cron: '0 0 * * *' = setiap hari jam 00:00
  cron.schedule('0 0 * * *', async () => {
    logger.info('[Scheduler] Memulai backup otomatis database...');
    try {
      const result = await backupService.runScheduledBackup();
      logger.info('[Scheduler] Backup otomatis berhasil', {
        filename: result.filename,
        sizeBytes: result.sizeBytes,
      });
    } catch (err) {
      logger.error('[Scheduler] Backup otomatis gagal', {
        message: err.message,
        stack: err.stack,
      });
    }
  }, {
    timezone: 'Asia/Makassar', // WITA (UTC+8) sesuai lokasi server
  });

  logger.info('[Scheduler] Backup scheduler initialized — berjalan setiap hari pukul 00:00 WITA');
};

export default initScheduler;
