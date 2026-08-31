import prisma from '../../config/database.js';
import logger from '../../config/logger.js';
import { PerpanjanganRepository } from './perpanjangan.repository.js';

/**
 * KinerjaSnapshotService
 * Menghitung dan menyimpan rekap kinerja harian ke tabel cache rekap_kinerja_harian.
 */
class KinerjaSnapshotService {
  /**
   * Jalankan snapshot untuk satu tanggal tertentu.
   * @param {string} dateStr - Format YYYY-MM-DD
   */
  static async snapshotForDate(dateStr) {
    logger.info(`[KinerjaSnapshot] Mulai snapshot rekap untuk tanggal ${dateStr}`);

    const raw = await PerpanjanganRepository.getKinerjaHarian({ date: dateStr });
    const records = raw.records || [];

    if (records.length === 0) {
      logger.info(`[KinerjaSnapshot] Tidak ada data untuk ${dateStr}, snapshot dilewati.`);
      return { tanggal: dateStr, totalUser: 0, totalRecords: 0 };
    }

    const userMap = new Map();

    for (const rec of records) {
      const userId = rec.editedById || (rec.editedBy?.id ?? null);
      if (!userId) continue;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          namaLengkap: rec.editedBy?.namaLengkap || rec.editedBy?.username || 'Unknown',
          username: rec.editedBy?.username || '',
          role: rec.editedBy?.role || '',
          pending: 0, approved: 0, srikandi: 0, selesai: 0, rejected: 0, total: 0
        });
      }

      const u = userMap.get(userId);
      u.total++;
      if (rec.status === 'PENDING') u.pending++;
      else if (rec.status === 'APPROVED') u.approved++;
      else if (rec.status === 'UPLOAD_SRIKANDI') u.srikandi++;
      else if (rec.status === 'SELESAI') u.selesai++;
      else if (rec.status === 'REJECTED') u.rejected++;
    }

    const tanggalDate = new Date(`${dateStr}T00:00:00.000Z`);

    const upsertOps = Array.from(userMap.values()).map(u =>
      prisma.rekapKinerjaHarian.upsert({
        where: { tanggal_userId: { tanggal: tanggalDate, userId: u.userId } },
        update: {
          namaLengkap: u.namaLengkap, username: u.username, role: u.role,
          pending: u.pending, approved: u.approved, srikandi: u.srikandi,
          selesai: u.selesai, rejected: u.rejected, total: u.total
        },
        create: {
          tanggal: tanggalDate, userId: u.userId,
          namaLengkap: u.namaLengkap, username: u.username, role: u.role,
          pending: u.pending, approved: u.approved, srikandi: u.srikandi,
          selesai: u.selesai, rejected: u.rejected, total: u.total
        }
      })
    );

    await Promise.all(upsertOps);

    logger.info(`[KinerjaSnapshot] Selesai ${dateStr}: ${userMap.size} user, ${records.length} record.`);
    return { tanggal: dateStr, totalUser: userMap.size, totalRecords: records.length };
  }

  /**
   * Snapshot hari kemarin — dipanggil scheduler jam 01:00 WITA.
   */
  static async snapshotHariKemarin() {
    const nowWita = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Makassar' }));
    nowWita.setDate(nowWita.getDate() - 1);
    const yyyy = nowWita.getFullYear();
    const mm = String(nowWita.getMonth() + 1).padStart(2, '0');
    const dd = String(nowWita.getDate()).padStart(2, '0');
    return KinerjaSnapshotService.snapshotForDate(`${yyyy}-${mm}-${dd}`);
  }

  /**
   * Baca cache dari tabel untuk tanggal tertentu.
   * @returns {Array|null} byUser array atau null jika tidak ada cache
   */
  static async getCachedByDate(dateStr) {
    const tanggalDate = new Date(`${dateStr}T00:00:00.000Z`);
    const rows = await prisma.rekapKinerjaHarian.findMany({
      where: { tanggal: tanggalDate },
      orderBy: { total: 'desc' }
    });

    if (!rows || rows.length === 0) return null;

    return rows.map(r => ({
      userId: r.userId, namaLengkap: r.namaLengkap, username: r.username, role: r.role,
      pending: r.pending, approved: r.approved, srikandi: r.srikandi,
      selesai: r.selesai, rejected: r.rejected, total: r.total
    }));
  }
}

export default KinerjaSnapshotService;
