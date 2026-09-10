import { RefJenisPensiunRepository } from './ref-jenis-pensiun.repository.js';

export class RefJenisPensiunService {
  static async getAll({ onlyActive = false, search = '' } = {}) {
    return await RefJenisPensiunRepository.findAll({ onlyActive, search });
  }

  static async getById(id) {
    const item = await RefJenisPensiunRepository.findById(id);
    if (!item) {
      const error = new Error('Jenis Pensiun tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return item;
  }

  static async create(data) {
    if (data.kode) {
      const existing = await RefJenisPensiunRepository.findByKode(data.kode);
      if (existing) {
        const error = new Error(`Kode jenis pensiun "${data.kode}" sudah digunakan`);
        error.statusCode = 400;
        throw error;
      }
    }
    return await RefJenisPensiunRepository.create(data);
  }

  static async update(id, data) {
    await this.getById(id);

    if (data.kode) {
      const existing = await RefJenisPensiunRepository.findByKode(data.kode, id);
      if (existing) {
        const error = new Error(`Kode jenis pensiun "${data.kode}" sudah digunakan`);
        error.statusCode = 400;
        throw error;
      }
    }

    return await RefJenisPensiunRepository.update(id, data);
  }

  static async delete(id) {
    const item = await this.getById(id);
    const totalUsage = (item._count?.dataP3k || 0) + (item._count?.dataP3kParuhWaktu || 0);
    if (totalUsage > 0) {
      const error = new Error('Jenis Pensiun tidak dapat dihapus karena masih digunakan oleh data pegawai pensiun.');
      error.statusCode = 400;
      throw error;
    }
    return await RefJenisPensiunRepository.softDelete(id);
  }
}
