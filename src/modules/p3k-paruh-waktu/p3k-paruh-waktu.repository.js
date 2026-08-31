import prisma from '../../config/database.js';

export class P3kParuhWaktuRepository {
  /**
   * Bulk create / upsert P3K Paruh Waktu records in chunks
   */
  static async bulkCreate(records, chunkSize = 500) {
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const result = await prisma.p3kParuhWaktu.createMany({
        data: chunk,
        skipDuplicates: true
      });
      insertedCount += result.count;
    }

    return insertedCount;
  }

  /**
   * Find many with pagination, search, and filters
   */
  static async findMany({ page = 1, limit = 10, search = '', unorNama = '', unorInduk = '', golAkhirNama = '', jenisJabatanNama = '' } = {}) {
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false
    };

    if (search) {
      where.OR = [
        { nipBaru: { contains: search } },
        { nama: { contains: search } },
        { unorNama: { contains: search } },
        { jabatanNama: { contains: search } },
        { nik: { contains: search } }
      ];
    }

    if (unorNama) {
      where.unorNama = { contains: unorNama };
    }

    if (unorInduk) {
      where.unorInduk = { contains: unorInduk };
    }

    if (golAkhirNama) {
      where.golAkhirNama = golAkhirNama;
    }

    if (jenisJabatanNama) {
      where.jenisJabatanNama = jenisJabatanNama;
    }

    const [total, data] = await Promise.all([
      prisma.p3kParuhWaktu.count({ where }),
      prisma.p3kParuhWaktu.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nama: 'asc' }
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find single record by ID or NIP Baru
   */
  static async findByIdOrNip(idOrNip) {
    return prisma.p3kParuhWaktu.findFirst({
      where: {
        OR: [
          { id: idOrNip },
          { nipBaru: idOrNip }
        ],
        isDeleted: false
      }
    });
  }

  /**
   * Get distinct list of Unor Nama for filters
   */
  static async getDistinctUnor() {
    const unors = await prisma.p3kParuhWaktu.findMany({
      where: { isDeleted: false, unorNama: { not: null } },
      select: { unorNama: true },
      distinct: ['unorNama'],
      orderBy: { unorNama: 'asc' }
    });
    return unors.map(u => u.unorNama).filter(Boolean);
  }

  /**
   * Get distinct list of Golongan for filters
   */
  static async getDistinctGolongan() {
    const gols = await prisma.p3kParuhWaktu.findMany({
      where: { isDeleted: false, golAkhirNama: { not: null } },
      select: { golAkhirNama: true },
      distinct: ['golAkhirNama'],
      orderBy: { golAkhirNama: 'asc' }
    });
    return gols.map(g => g.golAkhirNama).filter(Boolean);
  }

  /**
   * Get statistics summary of P3K Paruh Waktu
   */
  static async getStats() {
    const total = await prisma.p3kParuhWaktu.count({
      where: { isDeleted: false }
    });

    const [byGender, byGolongan, byJenisJabatan, topUnor] = await Promise.all([
      prisma.p3kParuhWaktu.groupBy({
        by: ['jenisKelamin'],
        where: { isDeleted: false },
        _count: { _all: true }
      }),
      prisma.p3kParuhWaktu.groupBy({
        by: ['golAkhirNama'],
        where: { isDeleted: false },
        _count: { _all: true },
        orderBy: { _count: { golAkhirNama: 'desc' } },
        take: 10
      }),
      prisma.p3kParuhWaktu.groupBy({
        by: ['jenisJabatanNama'],
        where: { isDeleted: false },
        _count: { _all: true }
      }),
      prisma.p3kParuhWaktu.groupBy({
        by: ['unorNama'],
        where: { isDeleted: false },
        _count: { _all: true },
        orderBy: { _count: { unorNama: 'desc' } },
        take: 10
      })
    ]);

    return {
      total,
      byGender: byGender.map(g => ({ jenisKelamin: g.jenisKelamin || 'Tidak Diketahui', count: g._count._all })),
      byGolongan: byGolongan.map(g => ({ golongan: g.golAkhirNama || 'Tanpa Golongan', count: g._count._all })),
      byJenisJabatan: byJenisJabatan.map(j => ({ jenisJabatan: j.jenisJabatanNama || 'Lainnya', count: j._count._all })),
      topUnor: topUnor.map(u => ({ unorNama: u.unorNama || 'Tanpa Unit Kerja', count: u._count._all }))
    };
  }

  /**
   * Delete all records
   */
  static async deleteAll() {
    return prisma.p3kParuhWaktu.deleteMany({});
  }

  /**
   * Delete single record
   */
  static async deleteById(id) {
    return prisma.p3kParuhWaktu.delete({
      where: { id }
    });
  }
}
