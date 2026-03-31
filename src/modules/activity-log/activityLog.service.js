import activityLogRepository from './activityLog.repository.js';

class ActivityLogService {
  constructor() {
    this.isLoggingEnabled = null;
  }

  async _checkLoggingEnabled() {
    if (this.isLoggingEnabled === null) {
      const config = await activityLogRepository.getAppConfig('ENABLE_ACTIVITY_LOGGING');
      this.isLoggingEnabled = config ? config.value === 'true' : true;
    }
    return this.isLoggingEnabled;
  }

  async toggleLogging(enabled) {
    const value = enabled ? 'true' : 'false';
    await activityLogRepository.setAppConfig('ENABLE_ACTIVITY_LOGGING', value);
    this.isLoggingEnabled = enabled;
    return enabled;
  }

  async getLoggingStatus() {
    return await this._checkLoggingEnabled();
  }

  /**
   * Log aktivitas tanpa mengganggu performa utama.
   * Didesain "fire and forget".
   */
  logActivity(userId, action, entityType, entityId, detailsObj = {}) {
    setImmediate(async () => {
      try {
        const isEnabled = await this._checkLoggingEnabled();
        if (!isEnabled) return;

        await activityLogRepository.createLog({
          userId,
          action,
          entityType,
          entityId,
          details: JSON.stringify(detailsObj) // parse as string to safely store JSON payload
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
    });
  }

  async getLogs(page, limit, filters) {
    return activityLogRepository.getLogs(page, limit, filters);
  }

  async archiveLogsByDays(daysOlder) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOlder);
    
    const archivedCount = await activityLogRepository.archiveOldLogs(cutoffDate);
    return {
      success: true,
      message: `${archivedCount} log(s) successfully archived.`,
      archivedCount
    };
  }
}

export default new ActivityLogService();
