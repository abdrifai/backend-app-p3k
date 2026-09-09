import prisma from '../../config/database.js';

export class KategoriMasalahRepository {
  static async findAll({ onlyActive = false } = {}) {
    const where = {
      isDeleted: false,
      ...(onlyActive ? { isActive: true } : {})
    };

    return await prisma.kategoriMasalah.findMany({
      where,
      select: {
        id: true,
        kode: true,
        nama: true,
        deskripsi: true,
        warnaBadge: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            masalahPegawai: {
              where: { isDeleted: false }
            }
          }
        }
      },
      orderBy: { nama: 'asc' }
    });
  }

  static async findById(id) {
    return await prisma.kategoriMasalah.findFirst({
      where: {
        id,
        isDeleted: false
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        deskripsi: true,
        warnaBadge: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  static async findByKode(kode, excludeId = null) {
    return await prisma.kategoriMasalah.findFirst({
      where: {
        kode,
        isDeleted: false,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      }
    });
  }

  static async create(data) {
    return await prisma.kategoriMasalah.create({
      data: {
        kode: data.kode,
        nama: data.nama,
        deskripsi: data.deskripsi || null,
        warnaBadge: data.warnaBadge || '#ef4444',
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  }

  static async update(id, data) {
    return await prisma.kategoriMasalah.update({
      where: { id },
      data
    });
  }

  static async softDelete(id) {
    return await prisma.kategoriMasalah.update({
      where: { id },
      data: { isDeleted: true }
    });
  }
}
