import kegiatanRepository from './kegiatan.repository.js';
import logger from '../../config/logger.js';

// Helper: map frontend 'label' field to DB 'nama' field
const toDbData = (data) => ({ nama: data.label ?? data.nama });

// Helper: expose 'label' alias alongside DB 'nama'
const toDto = (k) => ({ ...k, label: k.nama });

class KegiatanService {
  async create(data) {
    const kegiatan = await kegiatanRepository.create(toDbData(data));
    logger.info('Kegiatan created', { id: kegiatan.id });
    return toDto(kegiatan);
  }

  async getById(id) {
    const kegiatan = await kegiatanRepository.findById(id);
    if (!kegiatan) {
      const err = new Error('Kegiatan tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return toDto(kegiatan);
  }

  async update(id, data) {
    await this.getById(id);
    const updated = await kegiatanRepository.update(id, toDbData(data));
    logger.info('Kegiatan updated', { id });
    return toDto(updated);
  }

  async delete(id) {
    await this.getById(id);
    await kegiatanRepository.delete(id);
    logger.info('Kegiatan deleted', { id });
  }

  async list({ page = 1, limit = 10, search = '' }) {
    const result = await kegiatanRepository.getAll({ page, limit, search });
    return {
      ...result,
      data: result.data.map(toDto),
      totalPages: Math.ceil(result.total / limit),
    };
  }
}

export default new KegiatanService();
