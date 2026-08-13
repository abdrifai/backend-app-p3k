'use strict';

import { execFile }   from 'child_process';
import path           from 'path';
import { fileURLToPath } from 'url';
import backupRepository from './backup.repository.js';
import logger           from '../../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// uploads root: backend/uploads
const UPLOADS_ROOT = path.resolve(__dirname, '../../../../uploads');

// ─── Util: run a command and return stdout buffer ──────────────────────────
function runProcess(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 512 * 1024 * 1024, timeout: 120_000, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stderr }));
      resolve(stdout);
    });
  });
}

class BackupService {
  // ── SQL dump via mysqldump ───────────────────────────────────────────────
  async generateSql() {
    const url    = new URL(process.env.DATABASE_URL);
    const dbUser = decodeURIComponent(url.username);
    const dbPass = decodeURIComponent(url.password);
    const dbHost = url.hostname;
    const dbPort = url.port || '3306';
    const dbName = url.pathname.replace(/^\//, '');

    const args = [
      `--host=${dbHost}`,
      `--port=${dbPort}`,
      `--user=${dbUser}`,
      '--single-transaction',
      '--skip-lock-tables',
      '--routines',
      '--add-drop-table',
      '--complete-insert',
      '--default-character-set=utf8mb4',
      dbName,
    ];

    try {
      const sql = await runProcess('mysqldump', args, {
        env: { ...process.env, MYSQL_PWD: dbPass },
      });
      logger.info('Backup SQL generated', { dbName, bytes: sql.length });
      return sql;
    } catch (err) {
      logger.error('mysqldump failed', { message: err.message, stderr: err.stderr });
      const e = new Error('Gagal menjalankan mysqldump: ' + (err.stderr || err.message));
      e.statusCode = 500;
      throw e;
    }
  }

  // ── ZIP arsip folder ─────────────────────────────────────────────────────
  // folders: array of folder names inside uploads/ e.g. ['final-pk','pensiun-sk']
  // returns: Buffer of zip file
  async generateArchiveZip(folders = ['final-pk', 'pensiun-sk']) {
    const allowed  = ['final-pk', 'pensiun-sk', 'pension-sk'];
    const selected = folders.filter((f) => allowed.includes(f));
    if (selected.length === 0) {
      const e = new Error('Tidak ada folder arsip yang valid dipilih.');
      e.statusCode = 400;
      throw e;
    }

    // Build list of relative paths to zip (relative to UPLOADS_ROOT)
    // zip will be created with paths: final-pk/... pensiun-sk/...
    const args = ['-r', '-', ...selected];

    try {
      const buffer = await runProcess('zip', args, {
        cwd:      UPLOADS_ROOT,
        encoding: 'buffer', // get raw Buffer
      });
      logger.info('Archive ZIP generated', { folders: selected, bytes: buffer.length });
      return buffer;
    } catch (err) {
      logger.error('zip failed', { message: err.message });
      const e = new Error('Gagal membuat ZIP arsip: ' + err.message);
      e.statusCode = 500;
      throw e;
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  async getStats() {
    return backupRepository.getStats();
  }

  // ── Archive folder stats ─────────────────────────────────────────────────
  async getArchiveStats() {
    return backupRepository.getArchiveStats(UPLOADS_ROOT);
  }
}

export default new BackupService();
