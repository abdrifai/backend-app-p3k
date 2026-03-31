import { GajiRepository } from './gaji.repository.js';

export class GajiService {
  static async getAll(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;
    const { data, total } = await GajiRepository.findAll(offset, limit, search);
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

  static async lookup(golongan, mkTahun) {
    const gaji = await GajiRepository.findByGolonganMk(golongan, parseInt(mkTahun));
    if (!gaji) {
      return null;
    }
    return gaji;
  }

  static async create({ golongan, mkTahun, gaji, aturanGaji }) {
    return GajiRepository.create({ 
      golongan, 
      mkTahun: parseInt(mkTahun), 
      gaji: parseInt(gaji),
      aturanGaji
    });
  }

  static async bulkCreate(dataArray) {
    const parsed = dataArray.map(d => ({
      golongan: d.golongan,
      mkTahun: parseInt(d.mkTahun),
      gaji: parseInt(d.gaji),
      aturanGaji: d.aturanGaji
    }));
    return GajiRepository.createMany(parsed);
  }

  static async deleteById(id) {
    return GajiRepository.deleteById(id);
  }
}
