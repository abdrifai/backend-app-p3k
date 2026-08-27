'use strict';

import { execFile }   from 'child_process';
import fs             from 'fs';
import path           from 'path';
import { fileURLToPath } from 'url';
import backupRepository from './backup.repository.js';
import logger           from '../../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// uploads root: backend/uploads
const UPLOADS_ROOT = path.resolve(__dirname, '../../../../uploads');
// backupdb root: backend/backupdb
const BACKUP_DIR = path.resolve(__dirname, '../../../../backupdb');

// ─── Util: run a command and return stdout buffer ──────────────────────────
function runProcess(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 512 * 1024 * 1024, timeout: 120_000, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stderr }));
      resolve(stdout);
    });
  });
}

/**
 * Pastikan folder backupdb/ ada
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logger.info('Folder backupdb/ dibuat', { path: BACKUP_DIR });
  }
}

/**
 * Parse kredensial database dari DATABASE_URL
 */
function parseDbCredentials() {
  const url    = new URL(process.env.DATABASE_URL);
  const dbUser = decodeURIComponent(url.username);
  const dbPass = decodeURIComponent(url.password);
  const dbHost = url.hostname;
  const dbPort = url.port || '3306';
  const dbName = url.pathname.replace(/^\//, '');
  return { dbUser, dbPass, dbHost, dbPort, dbName };
}

/**
 * Format tanggal untuk nama file: YYYY-MM-DD_HH-mm-ss
 */
function formatDateForFilename(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d}_${hh}-${mm}-${ss}`;
}

class BackupService {
  // ── SQL dump via mysqldump (stream ke client — existing) ──────────────────
  async generateSql() {
    const { dbUser, dbPass, dbHost, dbPort, dbName } = parseDbCredentials();

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

  // ── Scheduled / Manual backup — simpan file ke disk ──────────────────────
  async runScheduledBackup() {
    ensureBackupDir();

    const dbName = process.env.DATABASE_NAME || 'P3K_DB';
    const now = new Date();
    const timestamp = formatDateForFilename(now);
    const filename = `${dbName}_${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    // Generate SQL dump
    const sql = await this.generateSql();

    // Tulis ke file
    fs.writeFileSync(filePath, sql, 'utf-8');

    const stat = fs.statSync(filePath);

    logger.info('Backup file tersimpan ke disk', {
      filename,
      sizeBytes: stat.size,
      path: filePath,
    });

    return {
      filename,
      filePath,
      sizeBytes: stat.size,
      createdAt: now.toISOString(),
    };
  }

  // ── List semua file backup di folder backupdb/ ───────────────────────────
  getBackupHistory() {
    ensureBackupDir();

    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith('.sql'))
        .map((f) => {
          const fullPath = path.join(BACKUP_DIR, f);
          const stat = fs.statSync(fullPath);
          return {
            filename: f,
            sizeBytes: stat.size,
            createdAt: stat.birthtime.toISOString(),
            modifiedAt: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Terbaru di atas

      return files;
    } catch (err) {
      logger.error('Gagal membaca folder backupdb/', { message: err.message });
      return [];
    }
  }

  // ── Download file backup tertentu ────────────────────────────────────────
  getBackupFilePath(filename) {
    ensureBackupDir();

    // Sanitasi: cegah path traversal
    const sanitized = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, sanitized);

    if (!fs.existsSync(filePath)) {
      const e = new Error(`File backup "${sanitized}" tidak ditemukan.`);
      e.statusCode = 404;
      throw e;
    }

    return filePath;
  }

  // ── Hapus file backup tertentu ───────────────────────────────────────────
  deleteBackupFile(filename) {
    ensureBackupDir();

    const sanitized = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, sanitized);

    if (!fs.existsSync(filePath)) {
      const e = new Error(`File backup "${sanitized}" tidak ditemukan.`);
      e.statusCode = 404;
      throw e;
    }

    fs.unlinkSync(filePath);
    logger.info('File backup dihapus', { filename: sanitized });

    return { filename: sanitized, deleted: true };
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
