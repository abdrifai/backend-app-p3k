import taskUsulanRepository from './task-usulan.repository.js';
import activityLogService from '../activity-log/activityLog.service.js';

class TaskUsulanService {
  async autoAssign({ userIds, amountPerUser, tmtFilters = [], tahun }) {
    if (!userIds || userIds.length === 0 || amountPerUser <= 0) {
      const error = new Error('Invalid assignment parameters');
      error.statusCode = 400;
      throw error;
    }

    const totalAssigned = await taskUsulanRepository.autoAssignTasks(userIds, amountPerUser, tmtFilters, tahun);
    return {
      message: `Berhasil membagikan ${totalAssigned} data usulan kepada ${userIds.length} user secara otomatis.`,
      totalAssigned
    };
  }

  async manualAssign({ assignments, tmtFilters = [], tahun }) {
    if (!assignments || assignments.length === 0) {
      const error = new Error('Invalid assignment data');
      error.statusCode = 400;
      throw error;
    }

    const totalAssigned = await taskUsulanRepository.manualAssignTasks(assignments, tmtFilters, tahun);
    return {
      message: `Berhasil membagikan total ${totalAssigned} data usulan secara manual.`,
      totalAssigned
    };
  }

  async getMyTasks(userId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const search = query.search || '';
    const tahun = query.tahun ? parseInt(query.tahun) : undefined;
    
    const skip = (page - 1) * limit;

    const { data, total } = await taskUsulanRepository.getTasksByUser(userId, { skip, take: limit, search, tahun });

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

  async completeTask(taskId, updateData, userId) {
    const updatedData = await taskUsulanRepository.completeTask(taskId, updateData, userId);
    
    // Log Activity
    activityLogService.logActivity(userId, 'COMPLETE_TASK', 'TaskUsulan', updatedData.dataP3k?.nipBaru || taskId, {
      updatedFields: Object.keys(updateData)
    });
    
    return updatedData;
  }

  async getReport(tahun) {
    return await taskUsulanRepository.getTaskReport(tahun);
  }

  async getUnassignedStats(tahun) {
    return await taskUsulanRepository.getUnassignedTmtStats(tahun);
  }

  async resetTasks(userId, tahun) {
    const totalRevoked = await taskUsulanRepository.unassignUserTasks(userId, tahun);
    return {
      message: `Berhasil menarik ${totalRevoked} tugas usulan dari user.`,
      totalRevoked
    };
  }

  async getMyTaskStats(userId, tahun) {
    return await taskUsulanRepository.getTaskTmtStatsByUser(userId, tahun);
  }

  async resetAllTasks(tahun) {
    const totalRevoked = await taskUsulanRepository.unassignAllTasks(tahun);
    return {
      message: `Berhasil menarik total ${totalRevoked} tugas usulan dari seluruh user.`,
      totalRevoked
    };
  }

  async searchAssignedTasks(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const search = query.search || '';
    const tahun = query.tahun ? parseInt(query.tahun) : undefined;

    const skip = (page - 1) * limit;

    const { data, total } = await taskUsulanRepository.searchAssignedTasks({ skip, take: limit, search, tahun });

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
}

export default new TaskUsulanService();
