import prisma from '../../config/database.js';

class TaskRepository {
  /**
   * Assign tasks evenly (or randomly grabbed) to a list of users
   */
  async autoAssignTasks(userIds, amountPerUser) {
    let totalAssigned = 0;

    for (const userId of userIds) {
      // Find assigned P3Ks to exclude them
      const assignedRecords = await prisma.taskPeremajaan.findMany({
        where: { isDeleted: false },
        select: { dataP3kId: true }
      });
      const assignedIds = assignedRecords.map(r => r.dataP3kId);

      // Find DataP3k that are AKTIF and not assigned
      const unassignedData = await prisma.dataP3k.findMany({
        where: { 
          id: { notIn: assignedIds }, 
          statusPensiun: 'AKTIF', 
          isDeleted: false 
        },
        take: amountPerUser,
        select: { id: true }
      });

      if (unassignedData.length === 0) break; // no more data to assign

      const newTasks = unassignedData.map(d => ({
        dataP3kId: d.id,
        assignedToUserId: userId,
        isCompleted: false
      }));

      const { count } = await prisma.taskPeremajaan.createMany({
        data: newTasks
      });

      totalAssigned += count;
    }

    return totalAssigned;
  }

  /**
   * Manual assignment based on an array of objects
   */
  async manualAssignTasks(assignments) {
    let totalAssigned = 0;

    for (const { userId, amount } of assignments) {
      if (amount <= 0) continue;

      const assignedRecords = await prisma.taskPeremajaan.findMany({
        where: { isDeleted: false },
        select: { dataP3kId: true }
      });
      const assignedIds = assignedRecords.map(r => r.dataP3kId);

      const unassignedData = await prisma.dataP3k.findMany({
        where: { 
          id: { notIn: assignedIds }, 
          statusPensiun: 'AKTIF', 
          isDeleted: false 
        },
        take: amount,
        select: { id: true }
      });

      if (unassignedData.length === 0) continue;

      const newTasks = unassignedData.map(d => ({
        dataP3kId: d.id,
        assignedToUserId: userId,
        isCompleted: false
      }));

      const { count } = await prisma.taskPeremajaan.createMany({
        data: newTasks
      });

      totalAssigned += count;
    }

    return totalAssigned;
  }

  /**
   * Get tasks (TaskPeremajaan) assigned to a specific user that are NOT completed
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
            { nik: { contains: search } }
          ]
        }
      } : {})
    };

    const [data, total] = await Promise.all([
      prisma.taskPeremajaan.findMany({
        where,
        skip,
        take,
        include: { dataP3k: {
          include: {
            unorInduk: true
          }
        } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.taskPeremajaan.count({ where })
    ]);

    return { data, total };
  }

  /**
   * Complete a task (update DataP3k and mark TaskPeremajaan completed)
   * @param {string} taskId refers to TaskPeremajaan id
   */
  async completeTask(taskId, updateData, editorUserId) {
    // 1. Get task first
    const task = await prisma.taskPeremajaan.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task tidak ditemukan");

    // NEW: Fetch old DataP3k for logging
    const oldDataP3k = await prisma.dataP3k.findUnique({ where: { id: task.dataP3kId } });

    // 2. Update DataP3k
    await prisma.dataP3k.update({
      where: { id: task.dataP3kId },
      data: {
        ...updateData,
        editedById: editorUserId
      }
    });

    // 3. Mark Task Complete
    const updatedTask = await prisma.taskPeremajaan.update({
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

    updatedTask.oldDataP3k = oldDataP3k;
    return updatedTask;
  }

  /**
   * Complete task by dataP3kId (when user updates DataP3k via normal data-p3k update)
   */
  async completeTaskByDataP3kId(dataP3kId, userId) {
    return await prisma.taskPeremajaan.updateMany({
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
    const [assignedGroup, completedGroup, users] = await Promise.all([
      prisma.taskPeremajaan.groupBy({
        by: ['assignedToUserId'],
        where: { isDeleted: false },
        _count: { id: true }
      }),
      prisma.taskPeremajaan.groupBy({
        by: ['assignedToUserId'],
        where: { isCompleted: true, isDeleted: false },
        _count: { id: true }
      }),
      prisma.user.findMany({
        where: { isDeleted: false },
        select: { id: true, username: true, namaLengkap: true, role: true }
      })
    ]);

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
   * Get unassigned data count
   */
  async getUnassignedCount() {
    const assignedRecords = await prisma.taskPeremajaan.findMany({
      where: { isDeleted: false },
      select: { dataP3kId: true }
    });
    const assignedIds = assignedRecords.map(r => r.dataP3kId);

    return await prisma.dataP3k.count({
      where: {
        id: { notIn: assignedIds },
        statusPensiun: 'AKTIF',
        isDeleted: false
      }
    });
  }

  /**
   * Reset assignments for specific users (unassign unfinished tasks by removing them)
   */
  async unassignUserTasks(userId) {
    const { count } = await prisma.taskPeremajaan.deleteMany({
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
    const { count } = await prisma.taskPeremajaan.deleteMany({
      where: {
        isCompleted: false
      }
    });
    return count;
  }
}

export default new TaskRepository();
