import prisma from '../../config/database.js';

export class RefUnorRepository {
  static async findAll({ skip = 0, take = 10, search = '' }) {
    let where = { isDeleted: false };
    if (search) {
      where.nama = { contains: search };
    }

    const [data, total] = await Promise.all([
      prisma.refUnor.findMany({
        where,
        skip,
        take,
        orderBy: { nama: 'asc' }
      }),
      prisma.refUnor.count({ where })
    ]);

    return { data, total };
  }

  static async findById(id) {
    return prisma.refUnor.findFirst({
      where: { id, isDeleted: false }
    });
  }

  static async findByName(nama, excludeId = null) {
    let where = { nama, isDeleted: false };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return prisma.refUnor.findFirst({ where });
  }

  static async create(data) {
    return prisma.refUnor.create({ data });
  }

  static async update(id, data) {
    return prisma.refUnor.update({
      where: { id },
      data
    });
  }

  static async delete(id) {
    return prisma.refUnor.update({
      where: { id },
      data: { isDeleted: true }
    });
  }
}
