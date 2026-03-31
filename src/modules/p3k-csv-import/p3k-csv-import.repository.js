import prisma from '../../config/database.js';

export class P3kCsvImportRepository {
  static async bulkCreate(data) {
    return prisma.p3kCsvImport.createMany({
      data,
      skipDuplicates: true
    });
  }

  static async deleteAll() {
    return prisma.p3kCsvImport.deleteMany({});
  }

  static async getLastImportTime() {
    const latest = await prisma.p3kCsvImport.findFirst({
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    return latest?.createdAt || null;
  }

  static _buildWhereClause({ search, unitKerja, tanggalSkCpns }) {
    let where = { AND: [] };

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } }
        ]
      });
    }

    if (unitKerja) {
      where.AND.push({
        OR: [
          { unorNama: { contains: unitKerja } },
          { lokasiKerjaNama: { contains: unitKerja } },
          { instansiKerjaNama: { contains: unitKerja } }
        ]
      });
    }

    if (tanggalSkCpns) {
      where.AND.push({
        tanggalSkCpns: { contains: tanggalSkCpns }
      });
    }

    // Prisma doesn't like an empty AND array if we have no conditions
    if (where.AND.length === 0) {
      return {};
    }
    
    return where;
  }

  static async findAll({ skip, take, search, unitKerja, tanggalSkCpns }) {
    const where = this._buildWhereClause({ search, unitKerja, tanggalSkCpns });

    return prisma.p3kCsvImport.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  static async count({ search, unitKerja, tanggalSkCpns } = {}) {
    const where = this._buildWhereClause({ search, unitKerja, tanggalSkCpns });
    return prisma.p3kCsvImport.count({ where });
  }

  static async groupByField(field) {
    const results = await prisma.p3kCsvImport.groupBy({
      by: [field],
      _count: { [field]: true },
      orderBy: { _count: { [field]: 'desc' } },
      take: 15
    });

    return results.map(r => ({
      label: r[field] || 'Tidak Diketahui',
      count: r._count[field]
    }));
  }

  static async getTotalCount() {
    return prisma.p3kCsvImport.count();
  }

  static async getGenderCount() {
    const results = await prisma.p3kCsvImport.groupBy({
      by: ['jenisKelamin'],
      _count: { jenisKelamin: true }
    });

    let laki = 0;
    let perempuan = 0;
    for (const r of results) {
      const val = (r.jenisKelamin || '').toUpperCase();
      if (val === 'M' || val === 'L' || val === '1' || val.includes('LAKI')) {
        laki += r._count.jenisKelamin;
      } else if (val === 'F' || val === 'P' || val === '2' || val.includes('PEREMPUAN')) {
        perempuan += r._count.jenisKelamin;
      }
    }

    return { laki, perempuan };
  }

  static async findByRetirementYear({ retirementYear, retirementAge = 58, skip, take, search }) {
    const birthYear = String(retirementYear - retirementAge);

    const where = { AND: [] };
    where.AND.push({ tanggalLahir: { endsWith: birthYear } });

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } },
          { unorNama: { contains: search } }
        ]
      });
    }

    return prisma.p3kCsvImport.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        nipBaru: true,
        nama: true,
        gelarDepan: true,
        gelarBelakang: true,
        tanggalLahir: true,
        jenisKelamin: true,
        pendidikanNama: true,
        jabatanNama: true,
        unorNama: true,
        lokasiKerjaNama: true,
        golAkhirNama: true
      },
      orderBy: { nama: 'asc' }
    });
  }

  static async countByRetirementYear({ retirementYear, retirementAge = 58, search }) {
    const birthYear = String(retirementYear - retirementAge);

    const where = { AND: [] };
    where.AND.push({ tanggalLahir: { endsWith: birthYear } });

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } },
          { unorNama: { contains: search } }
        ]
      });
    }

    return prisma.p3kCsvImport.count({ where });
  }

  static async groupRetirementByUnitKerja({ retirementYear, retirementAge = 58 }) {
    const birthYear = String(retirementYear - retirementAge);

    const results = await prisma.p3kCsvImport.groupBy({
      by: ['unorNama'],
      where: { tanggalLahir: { endsWith: birthYear } },
      _count: { unorNama: true },
      orderBy: { _count: { unorNama: 'desc' } },
      take: 20
    });

    return results.map(r => ({
      label: r.unorNama || 'Tidak Diketahui',
      count: r._count.unorNama
    }));
  }
}
