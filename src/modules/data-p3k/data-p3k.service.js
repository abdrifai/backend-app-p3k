import { DataP3kRepository } from './data-p3k.repository.js';
import TaskRepository from '../task/task.repository.js';
import activityLogService from '../activity-log/activityLog.service.js';
import prisma from '../../config/database.js';

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
      totalPensiun,
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
        pensiun: totalPensiun
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

  static async setPensiun({ nipBaru, nomorSk, tanggalSk, fileUrl }) {
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

    return await DataP3kRepository.setPensiun({
      nipBaru,
      nomorSk,
      tanggalSk,
      fileUrl
    });
  }
  static setPension = this.setPensiun;

  static async getAllPensiun({ page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const { data, total } = await DataP3kRepository.findAllPensiun({ skip, take: limit, search });

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
  static getAllPensioned = this.getAllPensiun;

  static async updatePensiun({ nipBaru, nomorSk, tanggalSk, fileUrl }) {
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

    return await DataP3kRepository.updatePensiun({
      nipBaru,
      nomorSk,
      tanggalSk,
      fileUrl
    });
  }
  static updatePension = this.updatePensiun;

  static async revertPensiun(nipBaru) {
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

    return await DataP3kRepository.revertPensiun(nipBaru);
  }
  static revertPension = this.revertPensiun;

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

  static async getByNipBaru(nipBaru) {
    const dataP3k = await DataP3kRepository.findByNipBaru(nipBaru);
    if (!dataP3k) {
      const error = new Error('Data Pegawai PPPK tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return dataP3k;
  }

  static async getMappingUnor({ search, unorNama, refUnorId, isMappingMode = false, unorStatus = 'ALL', page = 1, limit = 50 }) {
    const skip = (page - 1) * limit;
    const { data, total, summary } = await DataP3kRepository.getMappingUnor({
      search,
      unorNama,
      refUnorId,
      isMappingMode,
      unorStatus,
      skip,
      take: limit
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      },
      summary
    };
  }

  static async updateMappingUnor(id, unorIndukId, userId) {
    if (unorIndukId) {
      const ref = await prisma.refUnor.findFirst({
        where: { id: unorIndukId, isDeleted: false }
      });
      if (!ref) {
        const error = new Error('Unit Kerja (RefUnor) tidak valid atau telah dihapus');
        error.statusCode = 400;
        throw error;
      }
    }

    const updated = await DataP3kRepository.updateMappingUnor(id, unorIndukId);

    if (userId) {
      activityLogService.logActivity(userId, 'UPDATE_MAPPING_UNOR', 'DataP3k', updated.nipBaru, {
        unorIndukId,
        unorNama: updated.unorNama,
        unorIndukNama: updated.unorInduk?.nama || null
      });
    }

    return updated;
  }

  static async bulkUpdateMappingUnor(ids, unorIndukId, userId) {
    if (unorIndukId) {
      const ref = await prisma.refUnor.findFirst({
        where: { id: unorIndukId, isDeleted: false }
      });
      if (!ref) {
        const error = new Error('Unit Kerja (RefUnor) tidak valid atau telah dihapus');
        error.statusCode = 400;
        throw error;
      }
    }

    const result = await DataP3kRepository.bulkUpdateMappingUnor(ids, unorIndukId);

    if (userId) {
      activityLogService.logActivity(userId, 'BULK_UPDATE_MAPPING_UNOR', 'DataP3k', 'BULK', {
        count: result.count,
        unorIndukId
      });
    }

    return result;
  }
}
