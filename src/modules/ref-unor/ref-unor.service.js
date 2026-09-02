import { RefUnorRepository } from './ref-unor.repository.js';

export class RefUnorService {
  static async getAll({ page = 1, limit = 10, search = '', parentId = undefined, level = undefined, isIndukOnly = false }) {
    const skip = (page - 1) * limit;
    const { data, total } = await RefUnorRepository.findAll({ skip, take: limit, search, parentId, level, isIndukOnly });

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

  static async getTree() {
    return await RefUnorRepository.findTree();
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

    // Process parent and calculate level
    if (payload.parentId && payload.parentId.trim() !== '') {
      const parent = await RefUnorRepository.findById(payload.parentId);
      if (!parent) {
        error.message = 'Unit Kerja Induk (Parent) yang dipilih tidak ditemukan';
        error.status = 400;
        throw error;
      }
      payload.parentId = parent.id;
      payload.level = (parent.level || 1) + 1;
      if (!payload.jenis || payload.jenis === 'INDUK') {
        payload.jenis = 'SUB_UNOR';
      }
    } else {
      payload.parentId = null;
      payload.level = 1;
      if (!payload.jenis) {
        payload.jenis = 'INDUK';
      }
    }

    return await RefUnorRepository.create(payload);
  }

  static async update(id, payload) {
    const error = new Error();
    const row = await RefUnorRepository.findById(id);
    if (!row) {
      error.message = 'Referensi Unit Kerja tidak ditemukan';
      error.status = 404;
      throw error;
    }

    if (payload.nama) {
      const existing = await RefUnorRepository.findByName(payload.nama, id);
      if (existing) {
        error.message = 'Nama Unit Kerja sudah terpakai';
        error.status = 400;
        throw error;
      }
    }

    // Process parentId & level updates
    if (payload.parentId !== undefined) {
      if (payload.parentId && payload.parentId.trim() !== '') {
        if (payload.parentId === id) {
          error.message = 'Unit kerja tidak dapat menjadi induk bagi dirinya sendiri';
          error.status = 400;
          throw error;
        }

        // Circular ancestry check
        const isDescendant = await this.isDescendantOf(payload.parentId, id);
        if (isDescendant) {
          error.message = 'Tidak dapat memilih sub-unor turunan sebagai unit kerja induk';
          error.status = 400;
          throw error;
        }

        const parent = await RefUnorRepository.findById(payload.parentId);
        if (!parent) {
          error.message = 'Unit Kerja Induk (Parent) yang dipilih tidak ditemukan';
          error.status = 400;
          throw error;
        }
        payload.parentId = parent.id;
        payload.level = (parent.level || 1) + 1;
        if (payload.jenis === 'INDUK') {
          payload.jenis = 'SUB_UNOR';
        }
      } else {
        payload.parentId = null;
        payload.level = 1;
      }
    }

    return await RefUnorRepository.update(id, payload);
  }

  static async isDescendantOf(potentialDescendantId, ancestorId) {
    let currentId = potentialDescendantId;
    const visited = new Set();
    while (currentId) {
      if (currentId === ancestorId) return true;
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const node = await RefUnorRepository.findById(currentId);
      currentId = node?.parentId;
    }
    return false;
  }

  static async delete(id) {
    const error = new Error();
    const row = await RefUnorRepository.findById(id);
    if (!row) {
      error.message = 'Referensi Unit Kerja tidak ditemukan';
      error.status = 404;
      throw error;
    }

    if (row.children && row.children.length > 0) {
      error.message = `Tidak dapat menghapus unit kerja "${row.nama}" karena masih memiliki ${row.children.length} sub unit kerja di bawahnya. Hapus atau pindahkan sub unit kerja terlebih dahulu.`;
      error.status = 400;
      throw error;
    }

    if (row._count?.dataP3ks > 0) {
      error.message = `Tidak dapat menghapus unit kerja "${row.nama}" karena masih terhubung dengan ${row._count.dataP3ks} data pegawai P3K.`;
      error.status = 400;
      throw error;
    }

    return await RefUnorRepository.delete(id);
  }
}
