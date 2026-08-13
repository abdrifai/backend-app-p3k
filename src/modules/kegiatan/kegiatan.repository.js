import prisma from '../../config/database.js';
import logger from '../../config/logger.js';


class KegiatanRepository {
  async create(data) {
    const kegiatan = await prisma.kegiatan.create({ data });
    logger.info('Created Kegiatan', { id: kegiatan.id });
    return kegiatan;
  }

  async findById(id) {
    return prisma.kegiatan.findUnique({ where: { id } });
  }

  async update(id, data) {
    const updated = await prisma.kegiatan.update({ where: { id }, data });
    logger.info('Updated Kegiatan', { id });
    return updated;
  }

  async delete(id) {
    // Hard delete for now; can be changed to soft delete if needed
    return prisma.kegiatan.delete({ where: { id } });
  }

  async getAll({ page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const where = search ? { nama: { contains: search } } : {};
    const [data, total] = await Promise.all([
      prisma.kegiatan.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.kegiatan.count({ where })
    ]);
    return { data, total, page, limit };
  }
}

export default new KegiatanRepository();
