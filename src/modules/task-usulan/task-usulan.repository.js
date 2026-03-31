import prisma from '../../config/database.js';

class TaskUsulanRepository {
  /**
   * Assign tasks evenly (or randomly grabbed) to a list of users
   */
  async autoAssignTasks(userIds, amountPerUser, tmtFilters = []) {
    let totalAssigned = 0;

    for (const userId of userIds) {
      // Find assigned P3Ks to exclude them
      const assignedRecords = await prisma.taskUsulan.findMany({
        where: { isDeleted: false },
        select: { dataP3kId: true }
      });
      const assignedIds = assignedRecords.map(r => r.dataP3kId);

      // Build where clause
      const where = { 
        id: { notIn: assignedIds }, 
        statusPensiun: 'AKTIF', 
        isDeleted: false 
      };

      if (tmtFilters && tmtFilters.length > 0) {
        where.OR = tmtFilters.map(filter => ({
          tmtCpns: { contains: filter }
        }));
      }

      // Find DataP3k that are AKTIF and not assigned
      const unassignedData = await prisma.dataP3k.findMany({
        where,
        take: amountPerUser,
        select: { id: true }
      });

      if (unassignedData.length === 0) break; // no more data to assign

      const newTasks = unassignedData.map(d => ({
        dataP3kId: d.id,
        assignedToUserId: userId,
        isCompleted: false
      }));

      const { count } = await prisma.taskUsulan.createMany({
        data: newTasks
      });

      totalAssigned += count;
    }

    return totalAssigned;
  }

  /**
   * Manual assignment based on an array of objects
   */
  async manualAssignTasks(assignments, tmtFilters = []) {
    let totalAssigned = 0;

    for (const { userId, amount } of assignments) {
      if (amount <= 0) continue;

      const assignedRecords = await prisma.taskUsulan.findMany({
        where: { isDeleted: false },
        select: { dataP3kId: true }
      });
      const assignedIds = assignedRecords.map(r => r.dataP3kId);

      const where = { 
        id: { notIn: assignedIds }, 
        statusPensiun: 'AKTIF', 
        isDeleted: false 
      };

      if (tmtFilters && tmtFilters.length > 0) {
        where.OR = tmtFilters.map(filter => ({
          tmtCpns: { contains: filter }
        }));
      }

      const unassignedData = await prisma.dataP3k.findMany({
        where,
        take: amount,
        select: { id: true }
      });

      if (unassignedData.length === 0) continue;

      const newTasks = unassignedData.map(d => ({
        dataP3kId: d.id,
        assignedToUserId: userId,
        isCompleted: false
      }));

      const { count } = await prisma.taskUsulan.createMany({
        data: newTasks
      });

      totalAssigned += count;
    }

    return totalAssigned;
  }

  /**
   * Get tasks (TaskUsulan) assigned to a specific user that are NOT completed
   */
  async getTasksByUser(userId, { skip = 0, take = 10, search = '' }) {
    const where = {
      assignedToUserId: userId,
      isCompleted: false,
      isDeleted: false,
      ...(search ? {
        dataP3k: {
          OR: [
            { nama: { contains: search } },
            { nipBaru: { contains: search } },
            { nik: { contains: search } },
            { tmtCpns: { contains: search } }
          ]
        }
      } : {})
    };

    const [data, total] = await Promise.all([
      prisma.taskUsulan.findMany({
        where,
        skip,
        take,
        include: { dataP3k: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.taskUsulan.count({ where })
    ]);

    return { data, total };
  }

  /**
   * Complete a task (update TaskUsulan and mark it completed)
   * @param {string} taskId refers to TaskUsulan id
   * @param {object} updateData not used here for TaskUsulan just pass it through
   * @param {string} editorUserId the user doing the change 
   */
  async completeTask(taskId, updateData, editorUserId) {
    return await prisma.taskUsulan.update({
      where: { id: taskId },
      data: {
        isCompleted: true,
        completedAt: new Date()
      },
      include: {
        dataP3k: {
          select: { nipBaru: true }
        }
      }
    });
  }

  /**
   * Complete task by dataP3kId (when user creates an usulan directly from main menu)
   */
  async completeTaskByDataP3kId(dataP3kId, userId) {
    return await prisma.taskUsulan.updateMany({
      where: { 
        dataP3kId: dataP3kId,
        isCompleted: false,
        isDeleted: false
      },
      data: {
        isCompleted: true,
        assignedToUserId: userId,
        completedAt: new Date()
      }
    });
  }

  /**
   * Generate a report of all users and their task completion stats
   */
  async getTaskReport() {
    // We get grouping from DB, then map it by user
    const [assignedGroup, completedGroup, users] = await Promise.all([
      // Count total assigned to each user
      prisma.taskUsulan.groupBy({
        by: ['assignedToUserId'],
        where: { isDeleted: false },
        _count: { id: true }
      }),
      // Count total completed by each user
      prisma.taskUsulan.groupBy({
        by: ['assignedToUserId'],
        where: { isCompleted: true, isDeleted: false },
        _count: { id: true }
      }),
      // Get the list of users
      prisma.user.findMany({
        where: { isDeleted: false },
        select: { id: true, username: true, namaLengkap: true, role: true }
      })
    ]);

    // Format the report
    return users.map(user => {
      const assignedCount = assignedGroup.find(g => g.assignedToUserId === user.id)?._count.id || 0;
      const completedCount = completedGroup.find(g => g.assignedToUserId === user.id)?._count.id || 0;
      return {
        userId: user.id,
        username: user.username,
        namaLengkap: user.namaLengkap,
        role: user.role,
        totalAssigned: assignedCount,
        totalCompleted: completedCount,
        remaining: assignedCount - completedCount
      };
    }).filter(u => u.totalAssigned > 0 || u.role !== 'admin');
  }

  /**
   * Reset assignments for specific users (unassign unfinished tasks by removing them)
   */
  async unassignUserTasks(userId) {
    const { count } = await prisma.taskUsulan.deleteMany({
      where: {
        assignedToUserId: userId,
        isCompleted: false
      }
    });
    return count;
  }

  /**
   * Reset assignments for ALL users (unassign unfinished tasks everywhere)
   */
  async unassignAllTasks() {
    const { count } = await prisma.taskUsulan.deleteMany({
      where: {
        isCompleted: false
      }
    });
    return count;
  }

  /**
   * Get task statistics by TMT for a specific user
   */
  async getTaskTmtStatsByUser(userId) {
    const tasks = await prisma.taskUsulan.findMany({
      where: {
        assignedToUserId: userId,
        isDeleted: false,
        dataP3k: {
          tmtCpns: { not: null, not: '' }
        }
      },
      select: {
        isCompleted: true,
        dataP3k: {
          select: {
            tmtCpns: true
          }
        }
      }
    });

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Grouping logic (similar to DataP3kRepository)
    const grouped = {};
    tasks.forEach(t => {
      const tmt = t.dataP3k.tmtCpns;
      if (!tmt) return;
      
      const parts = tmt.split('-');
      // format should be DD-MM-YYYY
      if (parts.length === 3) {
        let yy = parts[2];
        let mm = parts[1];
        // Handle variations just in case (e.g. YYYY-MM-DD instead of DD-MM-YYYY)
        if (parts[0].length === 4) {
          yy = parts[0];
          mm = parts[1];
        }
        
        const monthIndex = parseInt(mm, 10) - 1;
        if (monthIndex < 0 || monthIndex > 11) return;

        const label = `TMT ${monthNames[monthIndex]} ${yy}`;
        // sortKey format: YYYYMM (e.g. 202102)
        const sortKey = parseInt(`${yy}${String(mm).padStart(2, '0')}`, 10);
        // filterValue: MM-YYYY for consistent search matching
        const filterValue = `${String(mm).padStart(2, '0')}-${yy}`;

        if (!grouped[sortKey]) {
          grouped[sortKey] = { label, total: 0, completed: 0, remaining: 0, sortKey, filterValue };
        }
        
        grouped[sortKey].total += 1;
        if (t.isCompleted) {
          grouped[sortKey].completed += 1;
        } else {
          grouped[sortKey].remaining += 1;
        }
      }
    });

    return Object.values(grouped).sort((a, b) => b.sortKey - a.sortKey);
  }

  async getUnassignedTmtStats() {
    // 1. Get all assigned DataP3k IDs
    const assignedRecords = await prisma.taskUsulan.findMany({
      where: { isDeleted: false },
      select: { dataP3kId: true }
    });
    const assignedIds = assignedRecords.map(r => r.dataP3kId);

    // 2. Get stats from DataP3kRepository for those not in assignedIds
    const { DataP3kRepository } = await import('../data-p3k/data-p3k.repository.js');
    return await DataP3kRepository.getTmtPengangkatanStats({
      id: { notIn: assignedIds },
      statusPensiun: 'AKTIF'
    });
  }

  async deleteTaskByDataP3kId(dataP3kId) {
    return await prisma.taskUsulan.deleteMany({
      where: { dataP3kId: dataP3kId }
    });
  }
}

export default new TaskUsulanRepository();
