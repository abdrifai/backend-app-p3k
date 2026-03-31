import prisma from '../../config/database.js';

export class GajiRepository {
  static async findAll(offset = 0, limit = 10, searchGolongan = '') {
    const where = { 
      isDeleted: false,
      ...(searchGolongan ? { golongan: { contains: searchGolongan } } : {})
    };
    const [data, total] = await Promise.all([
      prisma.tabelGaji.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ golongan: 'asc' }, { mkTahun: 'asc' }]
      }),
      prisma.tabelGaji.count({ where })
    ]);
    return { data, total };
  }

  static async findByGolonganMk(golongan, mkTahun) {
    return prisma.tabelGaji.findFirst({
      where: { 
        golongan, 
        mkTahun: { lte: mkTahun }, 
        isDeleted: false 
      },
      orderBy: { mkTahun: 'desc' }
    });
  }

  static async create({ golongan, mkTahun, gaji, aturanGaji }) {
    return prisma.tabelGaji.create({
      data: { golongan, mkTahun, gaji, aturanGaji }
    });
  }

  static async createMany(dataArray) {
    return prisma.tabelGaji.createMany({
      data: dataArray,
      skipDuplicates: true
    });
  }

  static async deleteById(id) {
    return prisma.tabelGaji.update({
      where: { id },
      data: { isDeleted: true }
    });
  }
}
