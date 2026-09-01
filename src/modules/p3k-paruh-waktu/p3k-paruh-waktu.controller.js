import { P3kParuhWaktuService } from './p3k-paruh-waktu.service.js';
import { p3kParuhWaktuQuerySchema, importParuhWaktuOptionSchema } from './p3k-paruh-waktu.validation.js';

export class P3kParuhWaktuController {
  /**
   * Upload and process CSV file
   */
  static async importCsv(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'File CSV wajib diunggah'
        });
      }

      const { error, value } = importParuhWaktuOptionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          data: null,
          message: error.details[0].message
        });
      }

      const result = await P3kParuhWaktuService.processCsv(req.file.buffer, {
        replaceAll: value.replaceAll
      });

      return res.status(200).json({
        success: true,
        data: result,
        message: `Berhasil mengimpor ${result.importedCount} data P3K Paruh Waktu`
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get list of P3K Paruh Waktu
   */
  static async getData(req, res, next) {
    try {
      const { error, value } = p3kParuhWaktuQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          data: null,
          message: error.details[0].message
        });
      }

      const result = await P3kParuhWaktuService.getData(value);
      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Data P3K Paruh Waktu berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single profile by ID or NIP
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await P3kParuhWaktuService.getByIdOrNip(id);
      if (!data) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Data P3K Paruh Waktu tidak ditemukan'
        });
      }

      return res.status(200).json({
        success: true,
        data,
        message: 'Detail P3K Paruh Waktu berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get filter options (unor list, golongan list)
   */
  static async getFilters(req, res, next) {
    try {
      const filters = await P3kParuhWaktuService.getFilterOptions();
      return res.status(200).json({
        success: true,
        data: filters,
        message: 'Opsi filter berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get statistics summary
   */
  static async getStats(req, res, next) {
    try {
      const stats = await P3kParuhWaktuService.getStats();
      return res.status(200).json({
        success: true,
        data: stats,
        message: 'Statistik P3K Paruh Waktu berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Clear all imported data
   */
  static async clearAll(req, res, next) {
    try {
      const result = await P3kParuhWaktuService.clearAll();
      return res.status(200).json({
        success: true,
        data: result,
        message: 'Semua data P3K Paruh Waktu berhasil dibersihkan'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete single record
   */
  static async deleteById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await P3kParuhWaktuService.deleteById(id);
      return res.status(200).json({
        success: true,
        data: result,
        message: 'Data P3K Paruh Waktu berhasil dihapus'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Sync all imported data to data_p3k_paruh_waktu
   */
  static async syncToMaster(req, res, next) {
    try {
      const result = await P3kParuhWaktuService.syncAllToMaster();
      return res.status(200).json({
        success: true,
        data: result,
        message: `Berhasil memindahkan ${result.syncedCount} data ke data_p3k_paruh_waktu`
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get master DataP3kParuhWaktu list
   */
  static async getMasterData(req, res, next) {
    try {
      const { error, value } = p3kParuhWaktuQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          data: null,
          message: error.details[0].message
        });
      }

      const result = await P3kParuhWaktuService.getMasterData(value);
      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Data Master P3K Paruh Waktu berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single Master DataP3kParuhWaktu by ID or NIP
   */
  static async getMasterById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await P3kParuhWaktuService.getMasterByIdOrNip(id);
      if (!data) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Data Master P3K Paruh Waktu tidak ditemukan'
        });
      }

      return res.status(200).json({
        success: true,
        data,
        message: 'Detail Master P3K Paruh Waktu berhasil diambil'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update Unor Induk Mapping for a single record
   */
  static async updateMappingUnor(req, res, next) {
    try {
      const { id, unorIndukId } = req.body;
      if (!id) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'ID data P3K Paruh Waktu wajib disertakan'
        });
      }

      const result = await P3kParuhWaktuService.updateMasterMappingUnor(id, unorIndukId);
      return res.status(200).json({
        success: true,
        data: result,
        message: 'Mapping Unit Kerja Induk berhasil diperbarui'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Bulk update Unor Induk Mapping
   */
  static async bulkUpdateMappingUnor(req, res, next) {
    try {
      const { ids, unorIndukId } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Daftar ID data P3K Paruh Waktu wajib disertakan'
        });
      }

      const result = await P3kParuhWaktuService.bulkUpdateMasterMappingUnor(ids, unorIndukId);
      return res.status(200).json({
        success: true,
        data: result,
        message: `Berhasil memperbarui mapping untuk ${result.count} data`
      });
    } catch (err) {
      next(err);
    }
  }
}

