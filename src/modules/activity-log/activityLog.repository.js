import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class ActivityLogRepository {
  async createLog(data) {
    return prisma.activityLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        details: data.details,
        userId: data.userId
      }
    });
  }

  async getLogs(page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const where = { isDeleted: false };
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;

    const [data, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, namaLengkap: true }
          }
        }
      }),
      prisma.activityLog.count({ where })
    ]);

    return { data, total, page, limit };
  }

  async getAppConfig(key) {
    return prisma.appConfig.findUnique({
      where: { key }
    });
  }

  async setAppConfig(key, value) {
    return prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  async archiveOldLogs(cutoffDate) {
    const oldLogs = await prisma.activityLog.findMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    if (oldLogs.length === 0) return 0;

    const insertArchive = prisma.activityLogArchive.createMany({
      data: oldLogs.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        userId: log.userId,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
      }))
    });

    const deleteOriginals = prisma.activityLog.deleteMany({
      where: {
        id: { in: oldLogs.map(l => l.id) }
      }
    });

    await prisma.$transaction([insertArchive, deleteOriginals]);
    return oldLogs.length;
  }
}

export default new ActivityLogRepository();
