'use strict';

import fs   from 'fs';
import path from 'path';
import prisma from '../../config/database.js';
import logger from '../../config/logger.js';

class BackupRepository {
  async getStats() {
    const [totalP3k, totalAktif, totalTask, totalSelesai, totalUser] =
      await Promise.all([
        prisma.dataP3k.count({ where: { isDeleted: false } }),
        prisma.dataP3k.count({ where: { isDeleted: false, statusPensiun: 'AKTIF' } }),
        prisma.taskPeremajaan.count({ where: { isDeleted: false } }),
        prisma.taskPeremajaan.count({ where: { isDeleted: false, isCompleted: true } }),
        prisma.user.count({ where: { isDeleted: false } }),
      ]);

    return { totalP3k, totalAktif, totalTask, totalSelesai, totalUser };
  }

  // Hitung jumlah file & total ukuran tiap folder arsip
  async getArchiveStats(uploadsRoot) {
    const folders = ['final-pk', 'pensiun-sk', 'pension-sk'];
    const result  = {};

    for (const folder of folders) {
      const dir = path.join(uploadsRoot, folder);
      try {
        const files     = fs.readdirSync(dir).filter((f) => {
          const stat = fs.statSync(path.join(dir, f));
          return stat.isFile();
        });
        const totalSize = files.reduce((sum, f) => {
          return sum + fs.statSync(path.join(dir, f)).size;
        }, 0);
        result[folder] = { count: files.length, totalSize };
      } catch {
        result[folder] = { count: 0, totalSize: 0 };
      }
    }

    return result;
  }
}

export default new BackupRepository();
