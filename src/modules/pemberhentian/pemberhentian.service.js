import { PemberhentianRepository } from './pemberhentian.repository.js';
import activityLogService from '../activity-log/activityLog.service.js';

export class PemberhentianService {
  /**
   * Set status pegawai menjadi PENSIUN / PEMBERHENTIAN
   */
  static async setPemberhentian({ nipBaru, nomorSk, tanggalSk, fileUrl, jenisPensiunId }, userId) {
    const pegawai = await PemberhentianRepository.findByNipBaru(nipBaru);
    if (!pegawai) {
      const error = new Error('Data P3K tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (pegawai.statusPensiun === 'PENSIUN') {
      const error = new Error('Pegawai sudah berstatus PENSIUN');
      error.statusCode = 400;
      throw error;
    }

    const result = await PemberhentianRepository.setPemberhentian({
      nipBaru,
      nomorSk,
      tanggalSk,
      fileUrl,
      jenisPensiunId
    });

    if (userId) {
      activityLogService.logActivity(userId, 'SET_PEMBERHENTIAN', 'DataP3k', nipBaru, {
        nomorSk,
        tanggalSk,
        jenisPensiunId,
        kategoriPegawai: result.kategoriPegawai
      });
    }

    return result;
  }
  static setPensiun = this.setPemberhentian;

  /**
   * Ambil daftar semua pegawai yang berstatus PENSIUN / PEMBERHENTIAN
   */
  static async getAllPemberhentian({ page = 1, limit = 10, search = '', jenisPensiunId = '', kategori = 'ALL' }) {
    const skip = (page - 1) * limit;
    const { data, total } = await PemberhentianRepository.findAllPemberhentian({
      skip,
      take: limit,
      search,
      jenisPensiunId,
      kategori
    });

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
  static getAllPensiun = this.getAllPemberhentian;

  /**
   * Edit data SK Pensiun & Jenis Pemberhentian
   */
  static async updatePemberhentian({ nipBaru, nomorSk, tanggalSk, fileUrl, jenisPensiunId }, userId) {
    const pegawai = await PemberhentianRepository.findByNipBaru(nipBaru);
    if (!pegawai) {
      const error = new Error('Data Pegawai PPPK tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (pegawai.statusPensiun !== 'PENSIUN') {
      const error = new Error('Pegawai belum berstatus PENSIUN');
      error.statusCode = 400;
      throw error;
    }

    const result = await PemberhentianRepository.updatePemberhentian({
      nipBaru,
      nomorSk,
      tanggalSk,
      fileUrl,
      jenisPensiunId
    });

    if (userId) {
      activityLogService.logActivity(userId, 'UPDATE_PEMBERHENTIAN', 'DataP3k', nipBaru, {
        nomorSk,
        tanggalSk,
        jenisPensiunId,
        kategoriPegawai: result.kategoriPegawai
      });
    }

    return result;
  }
  static updatePensiun = this.updatePemberhentian;

  /**
   * Kembalikan status pegawai dari PENSIUN ke AKTIF
   */
  static async revertPemberhentian(nipBaru, userId) {
    const pegawai = await PemberhentianRepository.findByNipBaru(nipBaru);
    if (!pegawai) {
      const error = new Error('Data Pegawai PPPK tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (pegawai.statusPensiun !== 'PENSIUN') {
      const error = new Error('Pegawai tidak berstatus PENSIUN');
      error.statusCode = 400;
      throw error;
    }

    const result = await PemberhentianRepository.revertPemberhentian(nipBaru);

    if (userId) {
      activityLogService.logActivity(userId, 'REVERT_PEMBERHENTIAN', 'DataP3k', nipBaru, {
        nama: pegawai.nama,
        kategoriPegawai: result.kategoriPegawai
      });
    }

    return result;
  }
  static revertPensiun = this.revertPemberhentian;
}
