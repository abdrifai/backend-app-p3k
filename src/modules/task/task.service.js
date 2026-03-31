import taskRepository from './task.repository.js';
import activityLogService from '../activity-log/activityLog.service.js';

class TaskService {
  async autoAssign(userIds, amountPerUser) {
    if (!userIds || userIds.length === 0 || amountPerUser <= 0) {
      const error = new Error('Invalid assignment parameters');
      error.statusCode = 400;
      throw error;
    }

    const totalAssigned = await taskRepository.autoAssignTasks(userIds, amountPerUser);
    return {
      message: `Berhasil membagikan ${totalAssigned} data kepada ${userIds.length} user secara otomatis.`,
      totalAssigned
    };
  }

  async manualAssign(assignments) {
    if (!assignments || assignments.length === 0) {
      const error = new Error('Invalid assignment data');
      error.statusCode = 400;
      throw error;
    }

    const totalAssigned = await taskRepository.manualAssignTasks(assignments);
    return {
      message: `Berhasil membagikan total ${totalAssigned} data secara manual.`,
      totalAssigned
    };
  }

  async getMyTasks(userId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const search = query.search || '';
    
    const skip = (page - 1) * limit;

    const { data, total } = await taskRepository.getTasksByUser(userId, { skip, take: limit, search });

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
    // Should verify if the task is actually assigned to the user or if user is admin
    // Or just let it update. We assume they can only see their tasks.
    const updatedData = await taskRepository.completeTask(taskId, updateData, userId);
    
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
      oldData
    });

    return updatedData;
  }

  async getReport() {
    return await taskRepository.getTaskReport();
  }

  async getUnassignedCount() {
    const total = await taskRepository.getUnassignedCount();
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
}

export default new TaskService();
