import prisma from '../../config/database.js';

export class KontrakRepository {
  /**
   * Find all contract history for a specific employee
   */
  static async findByDataP3kId(dataP3kId) {
    return prisma.riwayatKontrak.findMany({
      where: { dataP3kId, isDeleted: false },
      include: {
        arsipKontrak: {
          select: {
            id: true,
            namaFile: true,
            fileUrl: true
          }
        }
      },
      orderBy: { kontrakKe: 'asc' }
    });
  }

  /**
   * Get the latest contract number to auto-increment
   */
  static async getLatestKontrakKe(dataP3kId) {
    const latest = await prisma.riwayatKontrak.findFirst({
      where: { dataP3kId, isDeleted: false },
      orderBy: { kontrakKe: 'desc' },
      select: { kontrakKe: true }
    });
    return latest ? latest.kontrakKe : 0;
  }

  /**
   * Create a new contract entry with optional file archive
   */
  static async create({ dataP3kId, kontrakKe, tanggalMulai, tanggalSelesai, keterangan, fileUrl, namaFile, nomorKontrak, mkTahun, mkBulan, gajiPokok, golongan }) {
    return prisma.$transaction(async (tx) => {
      let arsipKontrakId = null;

      if (fileUrl) {
        const arsip = await tx.arsipKontrak.create({
          data: {
            namaFile: namaFile || null,
            fileUrl
          }
        });
        arsipKontrakId = arsip.id;
      }

      return tx.riwayatKontrak.create({
        data: {
          dataP3kId,
          kontrakKe,
          tanggalMulai,
          tanggalSelesai,
          keterangan: keterangan || null,
          nomorKontrak: nomorKontrak || null,
          mkTahun: mkTahun ?? null,
          mkBulan: mkBulan ?? null,
          gajiPokok: gajiPokok ?? null,
          golongan: golongan ?? null,
          arsipKontrakId
        },
        include: {
          arsipKontrak: {
            select: {
              id: true,
              namaFile: true,
              fileUrl: true
            }
          }
        }
      });
    });
  }

  /**
   * Update an existing contract entry
   */
  static async update(id, { tanggalMulai, tanggalSelesai, keterangan, fileUrl, namaFile, nomorKontrak, mkTahun, mkBulan, gajiPokok, golongan }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.riwayatKontrak.findUnique({
        where: { id },
        select: { arsipKontrakId: true }
      });

      if (!existing) {
        throw new Error('Riwayat kontrak tidak ditemukan');
      }

      // If new file uploaded, update or create arsip
      if (fileUrl) {
        if (existing.arsipKontrakId) {
          await tx.arsipKontrak.update({
            where: { id: existing.arsipKontrakId },
            data: {
              fileUrl,
              namaFile: namaFile || undefined
            }
          });
        } else {
          const arsip = await tx.arsipKontrak.create({
            data: { namaFile: namaFile || null, fileUrl }
          });
          await tx.riwayatKontrak.update({
            where: { id },
            data: { arsipKontrakId: arsip.id }
          });
        }
      }

      const updateData = {};
      if (tanggalMulai) updateData.tanggalMulai = tanggalMulai;
      if (tanggalSelesai) updateData.tanggalSelesai = tanggalSelesai;
      if (keterangan !== undefined) updateData.keterangan = keterangan;
      if (nomorKontrak !== undefined) updateData.nomorKontrak = nomorKontrak;
      if (mkTahun !== undefined) updateData.mkTahun = mkTahun;
      if (mkBulan !== undefined) updateData.mkBulan = mkBulan;
      if (gajiPokok !== undefined) updateData.gajiPokok = gajiPokok;
      if (golongan !== undefined) updateData.golongan = golongan;

      return tx.riwayatKontrak.update({
        where: { id },
        data: updateData,
        include: {
          arsipKontrak: {
            select: {
              id: true,
              namaFile: true,
              fileUrl: true
            }
          }
        }
      });
    });
  }

  /**
   * Soft delete a contract entry
   */
  static async softDelete(id) {
    return prisma.riwayatKontrak.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  /**
   * Find a single contract by ID
   */
  static async findById(id) {
    return prisma.riwayatKontrak.findUnique({
      where: { id },
      include: {
        arsipKontrak: true,
        dataP3k: {
          select: { id: true, nipBaru: true, nama: true }
        }
      }
    });
  }

  /**
   * Delete riwayat_kontrak by matching usulan details
   */
  static async deleteByUsulanMatch(dataP3kId, tanggalMulai, tanggalSelesai, keterangan, generatedFileUrl) {
    const riwayats = await prisma.riwayatKontrak.findMany({
      where: {
        dataP3kId,
        tanggalMulai,
        tanggalSelesai,
        keterangan: keterangan || `Perpanjangan kontrak (dari usulan)`
      },
      include: { arsipKontrak: true }
    });

    const target = riwayats.find(r => {
      if (generatedFileUrl) {
        return r.arsipKontrak && r.arsipKontrak.fileUrl === generatedFileUrl;
      }
      return !r.arsipKontrak;
    });

    if (target) {
      await prisma.riwayatKontrak.delete({ where: { id: target.id } });
      if (target.arsipKontrakId) {
        await prisma.arsipKontrak.delete({ where: { id: target.arsipKontrakId } });
      }
      return target;
    }
    return null;
  }

  /**
   * Update riwayat_kontrak fileUrl and metadata by matching usulan details
   */
  static async updateFileByUsulanMatch(dataP3kId, tanggalMulai, tanggalSelesai, keterangan, oldFileUrl, newFileUrl, newNamaFile, additionalData = {}) {
    const riwayats = await prisma.riwayatKontrak.findMany({
      where: {
        dataP3kId,
        tanggalMulai,
        tanggalSelesai,
        keterangan: keterangan || `Perpanjangan kontrak (dari usulan)`
      },
      include: { arsipKontrak: true }
    });

    const target = riwayats.find(r => {
      if (oldFileUrl) {
        return r.arsipKontrak && r.arsipKontrak.fileUrl === oldFileUrl;
      }
      return !r.arsipKontrak;
    });

    if (target) {
      return prisma.$transaction(async (tx) => {
        // Handle file archive update/creation
        if (target.arsipKontrakId) {
          await tx.arsipKontrak.update({
            where: { id: target.arsipKontrakId },
            data: { fileUrl: newFileUrl, namaFile: newNamaFile }
          });
        } else {
          const arsip = await tx.arsipKontrak.create({
            data: { namaFile: newNamaFile || null, fileUrl: newFileUrl }
          });
          await tx.riwayatKontrak.update({
            where: { id: target.id },
            data: { arsipKontrakId: arsip.id }
          });
        }

        // Apply additional metadata (nomorKontrak, gaji, etc)
        if (Object.keys(additionalData).length > 0) {
          await tx.riwayatKontrak.update({
            where: { id: target.id },
            data: additionalData
          });
        }

        return target;
      });
    }
    return null;
  }
}

