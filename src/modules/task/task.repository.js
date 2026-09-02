import prisma from '../../config/database.js';

class TaskRepository {
  /**
   * Assign tasks evenly (or randomly grabbed) to a list of users
   */
  async autoAssignTasks(userIds, amountPerUser, kegiatan = 'Umum') {
    let totalAssigned = 0;

    for (const userId of userIds) {
      // Find assigned P3Ks for this specific kegiatan to exclude them
      const assignedRecords = await prisma.taskPeremajaan.findMany({
        where: { isDeleted: false, kegiatan: kegiatan },
        select: { dataP3kId: true }
      });
      const assignedIds = assignedRecords.map(r => r.dataP3kId);

      // Find DataP3k that are AKTIF and not assigned to this kegiatan
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
        isCompleted: false,
        kegiatan: kegiatan
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
  async manualAssignTasks(assignments, kegiatan = 'Umum') {
    let totalAssigned = 0;

    for (const { userId, amount } of assignments) {
      if (amount <= 0) continue;

      const assignedRecords = await prisma.taskPeremajaan.findMany({
        where: { isDeleted: false, kegiatan: kegiatan },
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
        isCompleted: false,
        kegiatan: kegiatan
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
        include: {
          dataP3k: {
            include: {
              unorInduk: true,
              arsipSkCpns: true
            }
          }
        },
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
  async completeTask(taskId, updateData, editorUserId, fileData = null) {
    return prisma.$transaction(async (tx) => {
      // 1. Get task first
      const task = await tx.taskPeremajaan.findUnique({ where: { id: taskId } });
      if (!task) throw new Error("Task tidak ditemukan");

      // Fetch old DataP3k for logging
      const oldDataP3k = await tx.dataP3k.findUnique({
        where: { id: task.dataP3kId },
        include: { arsipSkCpns: true }
      });

      // Validate nomorSkCpns & fileSkCpns if nomorSkCpns is in active configs
      const activeNomorSk = await tx.taskFieldConfig.findFirst({
        where: { fieldName: 'nomorSkCpns', isActive: true }
      });

      if (activeNomorSk) {
        const nomorVal = updateData.nomorSkCpns !== undefined
          ? String(updateData.nomorSkCpns).trim()
          : (oldDataP3k.nomorSkCpns ? String(oldDataP3k.nomorSkCpns).trim() : '');

        if (!nomorVal) {
          const err = new Error('Nomor SK CPNS wajib diisi!');
          err.statusCode = 400;
          throw err;
        }

        const hasFile = fileData?.fileUrl || oldDataP3k.arsipSkCpns?.fileUrl;
        if (!hasFile) {
          const err = new Error('Dokumen SK CPNS (PDF) wajib diunggah!');
          err.statusCode = 400;
          throw err;
        }
      }

      let arsipSkCpnsId = oldDataP3k.arsipSkCpnsId;
      const nomorSkCpns = updateData.nomorSkCpns !== undefined ? updateData.nomorSkCpns : oldDataP3k.nomorSkCpns;
      const tanggalSkCpns = updateData.tanggalSkCpns !== undefined ? updateData.tanggalSkCpns : oldDataP3k.tanggalSkCpns;

      // Handle SK CPNS file or nomorSkCpns update
      if (fileData?.fileUrl || (nomorSkCpns && String(nomorSkCpns).trim() !== '')) {
        const trimmedNomorSk = nomorSkCpns && String(nomorSkCpns).trim() !== ''
          ? String(nomorSkCpns).trim()
          : (oldDataP3k.nipBaru + '_SK_CPNS');
        const trimmedTanggalSk = tanggalSkCpns ? String(tanggalSkCpns).trim() : null;

        let arsip = null;
        if (arsipSkCpnsId) {
          arsip = await tx.arsipSkCpns.findUnique({ where: { id: arsipSkCpnsId } });
        } else if (trimmedNomorSk) {
          arsip = await tx.arsipSkCpns.findUnique({ where: { nomorSk: trimmedNomorSk } });
        }

        if (arsip) {
          const updateArsip = { isDeleted: false };
          if (trimmedNomorSk) updateArsip.nomorSk = trimmedNomorSk;
          if (trimmedTanggalSk) updateArsip.tanggalSk = trimmedTanggalSk;
          if (fileData?.fileUrl) updateArsip.fileUrl = fileData.fileUrl;

          arsip = await tx.arsipSkCpns.update({
            where: { id: arsip.id },
            data: updateArsip
          });
          arsipSkCpnsId = arsip.id;
        } else {
          arsip = await tx.arsipSkCpns.create({
            data: {
              nomorSk: trimmedNomorSk,
              tanggalSk: trimmedTanggalSk,
              fileUrl: fileData?.fileUrl || null
            }
          });
          arsipSkCpnsId = arsip.id;
        }
      }

      // 2. Update DataP3k
      await tx.dataP3k.update({
        where: { id: task.dataP3kId },
        data: {
          ...updateData,
          ...(arsipSkCpnsId ? { arsipSkCpnsId } : {}),
          editedById: editorUserId
        }
      });

      // 3. Mark Task Complete
      const updatedTask = await tx.taskPeremajaan.update({
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
    });
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
   * - If kegiatan is provided: count AKTIF employees not yet assigned to that kegiatan
   * - If no kegiatan: count ALL AKTIF employees (total pool size)
   */
  async getUnassignedCount(kegiatan = '') {
    const trimmedKegiatan = (kegiatan || '').trim();
    // No kegiatan selected → show total pool of active employees
    if (!trimmedKegiatan) {
      return await prisma.dataP3k.count({
        where: { statusPensiun: 'AKTIF', isDeleted: false }
      });
    }

    // Specific kegiatan → exclude employees already assigned to this kegiatan
    const assignedRecords = await prisma.taskPeremajaan.findMany({
      where: { isDeleted: false, kegiatan: trimmedKegiatan },
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
   * Get comprehensive dashboard statistics for Task Peremajaan
   */
  async getDashboardStats(kegiatan = '') {
    const taskWhere = {
      isDeleted: false,
      ...(kegiatan ? { kegiatan } : {})
    };

    const [
      totalPegawaiAktif,
      totalAssigned,
      totalCompleted,
      totalSkCpnsUploaded,
      assignedGroup,
      completedGroup,
      users,
      recentCompleted,
      kegiatanList,
      unorGroup
    ] = await Promise.all([
      // 1. Total Pegawai Aktif
      prisma.dataP3k.count({
        where: { statusPensiun: 'AKTIF', isDeleted: false }
      }),
      // 2. Total Task Assigned
      prisma.taskPeremajaan.count({
        where: taskWhere
      }),
      // 3. Total Task Completed
      prisma.taskPeremajaan.count({
        where: { ...taskWhere, isCompleted: true }
      }),
      // 4. Total SK CPNS Uploaded in DataP3k
      prisma.dataP3k.count({
        where: {
          isDeleted: false,
          arsipSkCpnsId: { not: null }
        }
      }),
      // 5. Group by User - Total Assigned
      prisma.taskPeremajaan.groupBy({
        by: ['assignedToUserId'],
        where: taskWhere,
        _count: { id: true }
      }),
      // 6. Group by User - Total Completed
      prisma.taskPeremajaan.groupBy({
        by: ['assignedToUserId'],
        where: { ...taskWhere, isCompleted: true },
        _count: { id: true }
      }),
      // 7. Users
      prisma.user.findMany({
        where: { isDeleted: false },
        select: { id: true, username: true, namaLengkap: true, role: true, foto: true }
      }),
      // 8. Recent 15 Completed Tasks
      prisma.taskPeremajaan.findMany({
        where: { ...taskWhere, isCompleted: true },
        orderBy: [{ completedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 15,
        include: {
          dataP3k: {
            select: {
              id: true,
              nama: true,
              nipBaru: true,
              jabatanNama: true,
              unorNama: true,
              golAkhirNama: true,
              nomorSkCpns: true,
              arsipSkCpnsId: true,
              arsipSkCpns: {
                select: { id: true, fileUrl: true }
              }
            }
          },
          assignedToUser: {
            select: { id: true, username: true, namaLengkap: true, foto: true }
          }
        }
      }),
      // 9. Distinct Kegiatan List
      prisma.taskPeremajaan.findMany({
        where: { isDeleted: false },
        select: { kegiatan: true },
        distinct: ['kegiatan']
      }),
      // 10. Group by UNOR (from all dataP3k)
      prisma.dataP3k.groupBy({
        by: ['unorNama'],
        where: { statusPensiun: 'AKTIF', isDeleted: false },
        _count: { id: true }
      })
    ]);

    // Calculate unassigned
    let unassignedCount = 0;
    if (kegiatan) {
      const assignedRecords = await prisma.taskPeremajaan.findMany({
        where: { isDeleted: false, kegiatan },
        select: { dataP3kId: true }
      });
      const assignedIds = assignedRecords.map(r => r.dataP3kId);
      unassignedCount = await prisma.dataP3k.count({
        where: {
          id: { notIn: assignedIds },
          statusPensiun: 'AKTIF',
          isDeleted: false
        }
      });
    } else {
      unassignedCount = Math.max(0, totalPegawaiAktif - totalAssigned);
    }

    const totalPending = Math.max(0, totalAssigned - totalCompleted);
    const completionPercentage = totalAssigned > 0 ? Number(((totalCompleted / totalAssigned) * 100).toFixed(1)) : 0;
    const assignmentPercentage = totalPegawaiAktif > 0 ? Number(((totalAssigned / totalPegawaiAktif) * 100).toFixed(1)) : 0;

    // Operator progress list
    const byOperator = users.map(user => {
      const assigned = assignedGroup.find(g => g.assignedToUserId === user.id)?._count.id || 0;
      const completed = completedGroup.find(g => g.assignedToUserId === user.id)?._count.id || 0;
      const pending = Math.max(0, assigned - completed);
      const percent = assigned > 0 ? Number(((completed / assigned) * 100).toFixed(1)) : 0;

      return {
        userId: user.id,
        username: user.username,
        namaLengkap: user.namaLengkap,
        role: user.role,
        foto: user.foto,
        totalAssigned: assigned,
        totalCompleted: completed,
        totalPending: pending,
        completionPercentage: percent
      };
    }).filter(u => u.totalAssigned > 0 || !u.role.includes('admin'))
      .sort((a, b) => b.totalCompleted - a.totalCompleted || b.totalAssigned - a.totalAssigned);

    // Get completed count per UNOR
    const completedTasksWithUnor = await prisma.taskPeremajaan.findMany({
      where: { ...taskWhere, isCompleted: true },
      select: {
        dataP3k: {
          select: { unorNama: true }
        }
      }
    });

    const unorCompletedMap = {};
    completedTasksWithUnor.forEach(t => {
      const unor = t.dataP3k?.unorNama || 'Lainnya';
      unorCompletedMap[unor] = (unorCompletedMap[unor] || 0) + 1;
    });

    const byUnor = unorGroup.map(u => {
      const unorNama = u.unorNama || 'Tanpa Unit Kerja';
      const total = u._count.id || 0;
      const completed = unorCompletedMap[unorNama] || 0;
      const pending = Math.max(0, total - completed);
      const percent = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

      return {
        unorNama,
        totalPegawai: total,
        totalCompleted: completed,
        totalPending: pending,
        completionPercentage: percent
      };
    }).sort((a, b) => b.totalPegawai - a.totalPegawai);

    return {
      summary: {
        totalPegawaiAktif,
        totalAssigned,
        totalCompleted,
        totalPending,
        totalUnassigned: unassignedCount,
        totalSkCpnsUploaded,
        completionPercentage,
        assignmentPercentage
      },
      byOperator,
      byUnor,
      recentCompleted: recentCompleted.map(t => ({
        taskId: t.id,
        kegiatan: t.kegiatan,
        completedAt: t.completedAt || t.updatedAt,
        dataP3k: t.dataP3k,
        operator: t.assignedToUser
      })),
      kegiatanList: kegiatanList.map(k => k.kegiatan).filter(Boolean)
    };
  }

  /**
   * Get drilldown task records for dashboard modal / table
   */
  async getDashboardDetail({ status = '', userId = '', unorNama = '', kegiatan = '', search = '', skip = 0, take = 10 }) {
    if (status === 'unassigned') {
      let assignedIds = [];
      if (kegiatan) {
        const assignedRecords = await prisma.taskPeremajaan.findMany({
          where: { isDeleted: false, kegiatan },
          select: { dataP3kId: true }
        });
        assignedIds = assignedRecords.map(r => r.dataP3kId);
      } else {
        const assignedRecords = await prisma.taskPeremajaan.findMany({
          where: { isDeleted: false },
          select: { dataP3kId: true }
        });
        assignedIds = assignedRecords.map(r => r.dataP3kId);
      }

      const where = {
        id: { notIn: assignedIds },
        statusPensiun: 'AKTIF',
        isDeleted: false,
        ...(unorNama ? { unorNama } : {}),
        ...(search ? {
          OR: [
            { nama: { contains: search } },
            { nipBaru: { contains: search } },
            { jabatanNama: { contains: search } }
          ]
        } : {})
      };

      const [data, total] = await Promise.all([
        prisma.dataP3k.findMany({
          where,
          skip,
          take,
          orderBy: { nama: 'asc' },
          include: {
            arsipSkCpns: { select: { id: true, fileUrl: true } }
          }
        }),
        prisma.dataP3k.count({ where })
      ]);

      return {
        data: data.map(d => ({
          id: d.id,
          dataP3kId: d.id,
          dataP3k: d,
          isCompleted: false,
          isAssigned: false,
          kegiatan: '-',
          operator: null
        })),
        total
      };
    }

    const where = {
      isDeleted: false,
      ...(kegiatan ? { kegiatan } : {}),
      ...(userId ? { assignedToUserId: userId } : {}),
      ...(status === 'completed' ? { isCompleted: true } : {}),
      ...(status === 'pending' ? { isCompleted: false } : {}),
      ...(unorNama ? { dataP3k: { unorNama } } : {}),
      ...(search ? {
        dataP3k: {
          ...(unorNama ? { unorNama } : {}),
          OR: [
            { nama: { contains: search } },
            { nipBaru: { contains: search } },
            { jabatanNama: { contains: search } }
          ]
        }
      } : {})
    };

    const [tasks, total] = await Promise.all([
      prisma.taskPeremajaan.findMany({
        where,
        skip,
        take,
        orderBy: [{ isCompleted: 'desc' }, { completedAt: 'desc' }, { updatedAt: 'desc' }],
        include: {
          dataP3k: {
            include: {
              arsipSkCpns: { select: { id: true, fileUrl: true } }
            }
          },
          assignedToUser: {
            select: { id: true, username: true, namaLengkap: true, foto: true }
          }
        }
      }),
      prisma.taskPeremajaan.count({ where })
    ]);

    return {
      data: tasks.map(t => ({
        id: t.id,
        taskId: t.id,
        dataP3kId: t.dataP3kId,
        dataP3k: t.dataP3k,
        isCompleted: t.isCompleted,
        completedAt: t.completedAt,
        kegiatan: t.kegiatan,
        operator: t.assignedToUser
      })),
      total
    };
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

  /**
   * Search / list pegawai (DataP3k) for assignment with task info
   */
  async searchPegawaiForTask({ search = '', kegiatan = '', statusPenugasan = 'ALL', unorIndukId = '', skip = 0, take = 10 }) {
    const where = {
      isDeleted: false,
      statusPensiun: 'AKTIF'
    };

    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { nipBaru: { contains: search } },
        { nik: { contains: search } }
      ];
    }

    if (unorIndukId) {
      where.unorIndukId = unorIndukId;
    }

    if (statusPenugasan === 'ASSIGNED') {
      where.tasksPeremajaan = {
        some: {
          isDeleted: false,
          isCompleted: false,
          ...(kegiatan ? { kegiatan } : {})
        }
      };
    } else if (statusPenugasan === 'UNASSIGNED') {
      where.tasksPeremajaan = {
        none: {
          isDeleted: false,
          isCompleted: false,
          ...(kegiatan ? { kegiatan } : {})
        }
      };
    } else if (statusPenugasan === 'COMPLETED') {
      where.tasksPeremajaan = {
        some: {
          isDeleted: false,
          isCompleted: true,
          ...(kegiatan ? { kegiatan } : {})
        }
      };
    }

    const [data, total] = await Promise.all([
      prisma.dataP3k.findMany({
        where,
        skip,
        take,
        include: {
          unorInduk: { select: { id: true, nama: true } },
          tasksPeremajaan: {
            where: { isDeleted: false },
            include: {
              assignedToUser: {
                select: { id: true, username: true, namaLengkap: true, role: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { nama: 'asc' }
      }),
      prisma.dataP3k.count({ where })
    ]);

    return { data, total };
  }

  /**
   * Assign tasks by specific list of pegawai (dataP3kIds)
   */
  async assignTasksByPegawai(dataP3kIds, userId, kegiatan = 'Umum') {
    let totalAssigned = 0;
    const effectiveKegiatan = (kegiatan || 'Umum').trim();

    for (const dataP3kId of dataP3kIds) {
      const existingUncompletedTask = await prisma.taskPeremajaan.findFirst({
        where: {
          dataP3kId,
          kegiatan: effectiveKegiatan,
          isCompleted: false,
          isDeleted: false
        }
      });

      if (existingUncompletedTask) {
        await prisma.taskPeremajaan.update({
          where: { id: existingUncompletedTask.id },
          data: {
            assignedToUserId: userId,
            updatedAt: new Date()
          }
        });
        totalAssigned++;
      } else {
        await prisma.taskPeremajaan.create({
          data: {
            dataP3kId,
            assignedToUserId: userId,
            kegiatan: effectiveKegiatan,
            isCompleted: false
          }
        });
        totalAssigned++;
      }
    }

    return totalAssigned;
  }

  /**
   * Unassign tasks by specific dataP3kIds or taskIds
   */
  async unassignTasksByPegawai({ dataP3kIds = [], taskIds = [], kegiatan = '' }) {
    const where = {
      isCompleted: false
    };

    if (taskIds && taskIds.length > 0) {
      where.id = { in: taskIds };
    } else if (dataP3kIds && dataP3kIds.length > 0) {
      where.dataP3kId = { in: dataP3kIds };
      if (kegiatan) {
        where.kegiatan = kegiatan;
      }
    } else {
      return 0;
    }

    const { count } = await prisma.taskPeremajaan.deleteMany({ where });
    return count;
  }
}

export default new TaskRepository();
