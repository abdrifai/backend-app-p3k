import { DataP3kRepository } from './data-p3k.repository.js';
import TaskRepository from '../task/task.repository.js';
import activityLogService from '../activity-log/activityLog.service.js';

export class DataP3kService {
  static async syncDataFromImport() {
    try {
      const syncedCount = await DataP3kRepository.syncFromImport();
      return { syncedCount };
    } catch (error) {
      console.error('DataP3kService syncDataFromImport Error:', error);
      throw error;
    }
  }

  static async getAllDataP3k({ page = 1, limit = 10, search = '', unitKerja = '', unitKerjaKosong = false, unitKerjaAda = false, statusPensiun = '', tmtCpns = '', pendidikan = '', golongan = '', jenisJabatan = '' }) {
    const skip = (page - 1) * limit;

    const [data, totalCount, totalActive] = await Promise.all([
      DataP3kRepository.findAll({ skip, take: limit, search, unitKerja, unitKerjaKosong, unitKerjaAda, statusPensiun, tmtCpns, pendidikan, golongan, jenisJabatan }),
      DataP3kRepository.count({ search, unitKerja, unitKerjaKosong, unitKerjaAda, statusPensiun, tmtCpns, pendidikan, golongan, jenisJabatan }),
      DataP3kRepository.getTotalCount({ statusPensiun: 'AKTIF' })
    ]);

    return {
      data,
      meta: {
        total: totalCount,
        totalActive,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  static async getRetirementReport({ year, page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const retirementYear = parseInt(year);
    const currentYear = new Date().getFullYear();

    const [data, totalCount, byUnitKerja, projections] = await Promise.all([
      DataP3kRepository.findByRetirementYear({ retirementYear, skip, take: limit, search }),
      DataP3kRepository.countByRetirementYear({ retirementYear, search }),
      DataP3kRepository.groupRetirementByUnitKerja({ retirementYear }),
      DataP3kRepository.getRetirementProjection({ startYear: currentYear, count: 5 })
    ]);

    return {
      data,
      byUnitKerja,
      projections,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  static async getStatistics() {
    const activeFilter = { statusPensiun: 'AKTIF' };

    const [
      totalAll,
      totalActive,
      totalPension,
      genderCount,
      pendidikanStats,
      unorStats,
      golonganStats,
      pengangkatanStats,
      jenisJabatanStats
    ] = await Promise.all([
      DataP3kRepository.getTotalCount({}),
      DataP3kRepository.getTotalCount({ statusPensiun: 'AKTIF' }),
      DataP3kRepository.getTotalCount({ statusPensiun: 'PENSIUN' }),
      DataP3kRepository.getGenderCount(activeFilter),
      DataP3kRepository.groupByField('tingkatPendidikanNama', activeFilter),
      DataP3kRepository.groupByUnorInduk(activeFilter),
      DataP3kRepository.groupByField('golAkhirNama', activeFilter),
      DataP3kRepository.getTmtPengangkatanStats(activeFilter),
      DataP3kRepository.groupByField('jenisJabatanNama', activeFilter)
    ]);

    return {
      summary: {
        total: totalAll,
        aktif: totalActive,
        pensiun: totalPension
      },
      total: totalActive, // Keep for backward compatibility with existing charts
      gender: genderCount,
      byPendidikan: pendidikanStats,
      byUnor: unorStats,
      byGolongan: golonganStats,
      byPengangkatan: pengangkatanStats,
      byJenisJabatan: jenisJabatanStats
    };
  }
  static async getDifferences({ page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const { data, totalCount } = await DataP3kRepository.getDifferences({ skip, take: limit, search });
    
    return {
      data,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  static async setPension({ nipBaru, nomorSk, tanggalSk, fileUrl }) {
    const dataP3k = await DataP3kRepository.findByNipBaru(nipBaru);
    if (!dataP3k) {
      const error = new Error('Data P3K tidak ditemukan');
      error.status = 404;
      throw error;
    }

    if (dataP3k.statusPensiun === 'PENSIUN') {
      const error = new Error('Pegawai sudah berstatus PENSIUN');
      error.status = 400;
      throw error;
    }

    return await DataP3kRepository.setPension({
      nipBaru,
      nomorSk,
      tanggalSk,
      fileUrl
    });
  }

  static async getAllPensioned({ page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const { data, total } = await DataP3kRepository.findAllPensioned({ skip, take: limit, search });

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

  static async updatePension({ nipBaru, nomorSk, tanggalSk, fileUrl }) {
    const dataP3k = await DataP3kRepository.findByNipBaru(nipBaru);
    if (!dataP3k) {
      const error = new Error('Data P3K tidak ditemukan');
      error.status = 404;
      throw error;
    }

    if (dataP3k.statusPensiun !== 'PENSIUN') {
      const error = new Error('Pegawai belum berstatus PENSIUN');
      error.status = 400;
      throw error;
    }

    return await DataP3kRepository.updatePension({
      nipBaru,
      nomorSk,
      tanggalSk,
      fileUrl
    });
  }

  static async revertPension(nipBaru) {
    const dataP3k = await DataP3kRepository.findByNipBaru(nipBaru);
    if (!dataP3k) {
      const error = new Error('Data P3K tidak ditemukan');
      error.status = 404;
      throw error;
    }

    if (dataP3k.statusPensiun !== 'PENSIUN') {
      const error = new Error('Pegawai tidak berstatus PENSIUN');
      error.status = 400;
      throw error;
    }

    return await DataP3kRepository.revertPension(nipBaru);
  }

  static async updateData(nipBaru, payload, userId) {
    const dataP3k = await DataP3kRepository.findByNipBaru(nipBaru);
    if (!dataP3k) {
      const error = new Error('Data P3K tidak ditemukan');
      error.status = 404;
      throw error;
    }
    const updatedData = await DataP3kRepository.patchData(nipBaru, payload);

    if (userId) {
      // Mark as complete if there was any task assigned.
      await TaskRepository.completeTaskByDataP3kId(dataP3k.id, userId);
      
      const oldData = {};
      Object.keys(payload).forEach(key => {
        if (dataP3k[key] !== undefined) {
          oldData[key] = dataP3k[key];
        }
      });

      // Log the activity
      activityLogService.logActivity(userId, 'UPDATE', 'DataP3k', nipBaru, {
        updatedFields: Object.keys(payload),
        oldData
      });
    }

    return updatedData;
  }
}
