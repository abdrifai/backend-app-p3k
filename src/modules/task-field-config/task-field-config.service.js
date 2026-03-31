import taskFieldConfigRepository from './task-field-config.repository.js';

class TaskFieldConfigService {
  async getAll() {
    return taskFieldConfigRepository.findAll();
  }

  async getActive() {
    return taskFieldConfigRepository.findActive();
  }

  async batchUpdate(configs) {
    if (!configs || configs.length === 0) {
      const error = new Error('Data konfigurasi tidak boleh kosong');
      error.statusCode = 400;
      throw error;
    }
    return taskFieldConfigRepository.batchUpdate(configs);
  }
}

export default new TaskFieldConfigService();
