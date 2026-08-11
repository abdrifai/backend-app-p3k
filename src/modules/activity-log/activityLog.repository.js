import prisma from '../../config/database.js';

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
    let matchedEmployee = null;

    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.action) where.action = filters.action;

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const nipConditions = [];
    if (filters.nip && filters.nip.trim()) {
      const cleanNip = filters.nip.trim();
      
      // 1. Direct contains in entityId or details
      nipConditions.push({ entityId: { contains: cleanNip } });
      nipConditions.push({ details: { contains: cleanNip } });

      // 2. Lookup related DataP3k records and their related tasks/usulan IDs
      try {
        const p3kRecords = await prisma.dataP3k.findMany({
          where: {
            OR: [
              { nipBaru: { contains: cleanNip } },
              { nipLama: { contains: cleanNip } }
            ]
          },
          select: {
            id: true,
            nipBaru: true,
            nipLama: true,
            nama: true,
            jabatanNama: true,
            satuanKerjaKerjaNama: true,
            tasksPeremajaan: { select: { id: true } },
            tasksUsulan: { select: { id: true } },
            usulanPerpanjangan: { select: { id: true } }
          },
          take: 10
        });

        if (p3kRecords.length > 0) {
          const relatedIds = new Set();
          p3kRecords.forEach(p => {
            if (p.id) relatedIds.add(p.id);
            p.tasksPeremajaan?.forEach(t => relatedIds.add(t.id));
            p.tasksUsulan?.forEach(t => relatedIds.add(t.id));
            p.usulanPerpanjangan?.forEach(u => relatedIds.add(u.id));
          });

          if (relatedIds.size > 0) {
            nipConditions.push({ entityId: { in: Array.from(relatedIds) } });
          }

          const exactMatch = p3kRecords.find(p => p.nipBaru === cleanNip || p.nipLama === cleanNip) || p3kRecords[0];
          matchedEmployee = {
            id: exactMatch.id,
            nipBaru: exactMatch.nipBaru,
            nipLama: exactMatch.nipLama,
            nama: exactMatch.nama,
            jabatanNama: exactMatch.jabatanNama,
            satuanKerjaKerjaNama: exactMatch.satuanKerjaKerjaNama
          };
        }
      } catch (err) {
        console.error('Error fetching DataP3k for NIP search in activity log repository:', err);
      }
    }

    const searchConditions = [];
    if (filters.search && filters.search.trim()) {
      const cleanSearch = filters.search.trim();
      searchConditions.push({ action: { contains: cleanSearch } });
      searchConditions.push({ entityType: { contains: cleanSearch } });
      searchConditions.push({ entityId: { contains: cleanSearch } });
      searchConditions.push({ details: { contains: cleanSearch } });
      searchConditions.push({
        user: {
          OR: [
            { username: { contains: cleanSearch } },
            { namaLengkap: { contains: cleanSearch } }
          ]
        }
      });
    }

    // Combine conditions
    if (nipConditions.length > 0 && searchConditions.length > 0) {
      where.AND = [
        { OR: nipConditions },
        { OR: searchConditions }
      ];
    } else if (nipConditions.length > 0) {
      where.OR = nipConditions;
    } else if (searchConditions.length > 0) {
      where.OR = searchConditions;
    } else if (filters.entityId && filters.entityId.trim()) {
      where.entityId = { contains: filters.entityId.trim() };
    }

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

    return { 
      data, 
      total, 
      page, 
      limit, 
      totalPages: Math.ceil(total / limit) || 1,
      matchedEmployee 
    };
  }

  async getEmployeeByNip(nip) {
    if (!nip) return null;
    return prisma.dataP3k.findFirst({
      where: {
        OR: [
          { nipBaru: nip.trim() },
          { nipLama: nip.trim() }
        ]
      },
      select: {
        id: true,
        nipBaru: true,
        nipLama: true,
        nama: true,
        jabatanNama: true,
        satuanKerjaKerjaNama: true
      }
    });
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
