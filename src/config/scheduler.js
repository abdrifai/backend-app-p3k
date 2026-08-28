'use strict';

import cron from 'node-cron';
import logger from './logger.js';
import backupService from '../modules/backup/backup.service.js';
import KinerjaSnapshotService from '../modules/perpanjangan/kinerja-snapshot.service.js';

/**
 * Inisialisasi semua scheduler otomatis.
 */
const initScheduler = () => {
  // ─── 1. Backup Database: setiap hari jam 00:00 WITA ───────────────────────
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
    timezone: 'Asia/Makassar', // WITA (UTC+8)
  });

  logger.info('[Scheduler] Backup scheduler initialized — berjalan setiap hari pukul 00:00 WITA');

  // ─── 2. Snapshot Rekap Kinerja: setiap hari jam 01:00 WITA ───────────────
  cron.schedule('0 1 * * *', async () => {
    logger.info('[Scheduler] Memulai snapshot rekap kinerja harian untuk hari kemarin...');
    try {
      const result = await KinerjaSnapshotService.snapshotHariKemarin();
      logger.info('[Scheduler] Snapshot rekap kinerja berhasil', result);
    } catch (err) {
      logger.error('[Scheduler] Snapshot rekap kinerja gagal', {
        message: err.message,
        stack: err.stack,
      });
    }
  }, {
    timezone: 'Asia/Makassar', // WITA (UTC+8)
  });

  logger.info('[Scheduler] Kinerja snapshot scheduler initialized — berjalan setiap hari pukul 01:00 WITA');
};

export default initScheduler;
