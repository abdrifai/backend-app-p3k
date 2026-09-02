import taskRepository from './task.repository.js';
import activityLogService from '../activity-log/activityLog.service.js';

class TaskService {
  async autoAssign(userIds, amountPerUser, kegiatan = 'Umum') {
    if (!userIds || userIds.length === 0 || amountPerUser <= 0) {
      const error = new Error('Invalid assignment parameters');
      error.statusCode = 400;
      throw error;
    }

    const totalAssigned = await taskRepository.autoAssignTasks(userIds, amountPerUser, kegiatan);
    return {
      message: `Berhasil membagikan ${totalAssigned} data kepada ${userIds.length} user secara otomatis.`,
      totalAssigned
    };
  }

  async manualAssign(assignments, kegiatan = 'Umum') {
    if (!assignments || assignments.length === 0) {
      const error = new Error('Invalid assignment data');
      error.statusCode = 400;
      throw error;
    }

    const totalAssigned = await taskRepository.manualAssignTasks(assignments, kegiatan);
    return {
      message: `Berhasil membagikan total ${totalAssigned} data secara manual.`,
      totalAssigned
    };
  }

  async getMyTasks(userId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const search = query.search || '';
    const kegiatan = query.kegiatan || '';
    
    const skip = (page - 1) * limit;

    const { data, total } = await taskRepository.getTasksByUser(userId, { skip, take: limit, search, kegiatan });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async completeTask(taskId, updateData, userId, fileData = null) {
    // Should verify if the task is actually assigned to the user or if user is admin
    // Or just let it update. We assume they can only see their tasks.
    const updatedData = await taskRepository.completeTask(taskId, updateData, userId, fileData);
    
    // Extract old data for logging
    const oldData = {};
    if (updatedData.oldDataP3k) {
      Object.keys(updateData).forEach(key => {
        if (updatedData.oldDataP3k[key] !== undefined) {
          oldData[key] = updatedData.oldDataP3k[key];
        }
      });
      delete updatedData.oldDataP3k;
    }

    // Log Activity
    activityLogService.logActivity(userId, 'COMPLETE_TASK', 'TaskPeremajaan', updatedData.dataP3k?.nipBaru || taskId, {
      updatedFields: Object.keys(updateData),
      hasFileUpload: !!fileData,
      oldData
    });

    return updatedData;
  }

  async getReport() {
    return await taskRepository.getTaskReport();
  }

  async getDashboardStats(kegiatan = '') {
    return await taskRepository.getDashboardStats(kegiatan);
  }

  async getDashboardDetail(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const status = query.status || '';
    const userId = query.userId || '';
    const unorNama = query.unorNama || '';
    const kegiatan = query.kegiatan || '';
    const search = query.search || '';

    const skip = (page - 1) * limit;

    const { data, total } = await taskRepository.getDashboardDetail({
      status,
      userId,
      unorNama,
      kegiatan,
      search,
      skip,
      take: limit
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getUnassignedCount(kegiatan = '') {
    const total = await taskRepository.getUnassignedCount(kegiatan);
    return { totalAvailable: total };
  }

  async resetTasks(userId) {
    const totalRevoked = await taskRepository.unassignUserTasks(userId);
    return {
      message: `Berhasil menarik ${totalRevoked} tugas dari user.`,
      totalRevoked
    };
  }

  async resetAllTasks() {
    const totalRevoked = await taskRepository.unassignAllTasks();
    return {
      message: `Berhasil menarik total ${totalRevoked} tugas dari seluruh user.`,
      totalRevoked
    };
  }

  async searchPegawaiForTask(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const search = query.search || '';
    const kegiatan = query.kegiatan || '';
    const statusPenugasan = query.statusPenugasan || 'ALL';
    const unorIndukId = query.unorIndukId || '';

    const skip = (page - 1) * limit;

    const { data, total } = await taskRepository.searchPegawaiForTask({
      search,
      kegiatan,
      statusPenugasan,
      unorIndukId,
      skip,
      take: limit
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async assignByPegawai(dataP3kIds, userId, kegiatan = 'Umum') {
    if (!dataP3kIds || dataP3kIds.length === 0) {
      const error = new Error('Pilih minimal 1 data pegawai');
      error.statusCode = 400;
      throw error;
    }

    if (!userId) {
      const error = new Error('Pilih user yang akan ditugaskan');
      error.statusCode = 400;
      throw error;
    }

    const totalAssigned = await taskRepository.assignTasksByPegawai(dataP3kIds, userId, kegiatan);
    return {
      message: `Berhasil menugaskan ${totalAssigned} data pegawai ke user.`,
      totalAssigned
    };
  }

  async unassignPegawai({ dataP3kIds = [], taskIds = [], kegiatan = '' }) {
    const totalRevoked = await taskRepository.unassignTasksByPegawai({ dataP3kIds, taskIds, kegiatan });
    return {
      message: `Berhasil menarik tugas dari ${totalRevoked} data pegawai.`,
      totalRevoked
    };
  }
}

export default new TaskService();
