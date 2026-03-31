import { RefUnorRepository } from './ref-unor.repository.js';

export class RefUnorService {
  static async getAll({ page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const { data, total } = await RefUnorRepository.findAll({ skip, take: limit, search });

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

  static async getById(id) {
    const error = new Error();
    const result = await RefUnorRepository.findById(id);
    if (!result) {
      error.message = 'Referensi Unit Kerja tidak ditemukan';
      error.status = 404;
      throw error;
    }
    return result;
  }

  static async create(payload) {
    const error = new Error();
    const existing = await RefUnorRepository.findByName(payload.nama);
    if (existing) {
      error.message = 'Nama Unit Kerja sudah ada';
      error.status = 400;
      throw error;
    }
    return await RefUnorRepository.create(payload);
  }

  static async update(id, payload) {
    const error = new Error();
    const existing = await RefUnorRepository.findByName(payload.nama, id);
    if (existing) {
      error.message = 'Nama Unit Kerja sudah terpakai';
      error.status = 400;
      throw error;
    }

    const row = await RefUnorRepository.findById(id);
    if (!row) {
      error.message = 'Referensi Unit Kerja tidak ditemukan';
      error.status = 404;
      throw error;
    }

    return await RefUnorRepository.update(id, payload);
  }

  static async delete(id) {
    const error = new Error();
    const row = await RefUnorRepository.findById(id);
    if (!row) {
      error.message = 'Referensi Unit Kerja tidak ditemukan';
      error.status = 404;
      throw error;
    }
    return await RefUnorRepository.delete(id);
  }
}
