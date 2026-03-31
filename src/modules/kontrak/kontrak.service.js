import { KontrakRepository } from './kontrak.repository.js';
import { DataP3kRepository } from '../data-p3k/data-p3k.repository.js';

export class KontrakService {
  /**
   * Get contract history for an employee by nipBaru
   */
  static async getByNipBaru(nipBaru) {
    const dataP3k = await DataP3kRepository.findByNipBaru(nipBaru);
    if (!dataP3k) {
      const error = new Error('Data P3K tidak ditemukan');
      error.status = 404;
      throw error;
    }

    const contracts = await KontrakRepository.findByDataP3kId(dataP3k.id);
    return {
      pegawai: {
        id: dataP3k.id,
        nipBaru: dataP3k.nipBaru,
        nama: dataP3k.nama,
        gelarDepan: dataP3k.gelarDepan,
        gelarBelakang: dataP3k.gelarBelakang
      },
      contracts
    };
  }

  /**
   * Add a new contract (perpanjangan kontrak)
   */
  static async addContract({ nipBaru, tanggalMulai, tanggalSelesai, keterangan, fileUrl, namaFile, nomorKontrak, golongan, gajiPokok, mkTahun, mkBulan }) {
    const dataP3k = await DataP3kRepository.findByNipBaru(nipBaru);
    if (!dataP3k) {
      const error = new Error('Data P3K tidak ditemukan');
      error.status = 404;
      throw error;
    }

    // Auto-calculate contract number
    const latestKe = await KontrakRepository.getLatestKontrakKe(dataP3k.id);
    const kontrakKe = latestKe + 1;

    return KontrakRepository.create({
      dataP3kId: dataP3k.id,
      kontrakKe,
      tanggalMulai,
      tanggalSelesai,
      keterangan,
      fileUrl,
      namaFile,
      nomorKontrak,
      golongan,
      gajiPokok,
      mkTahun: mkTahun !== undefined ? parseInt(mkTahun) : undefined,
      mkBulan: mkBulan !== undefined ? parseInt(mkBulan) : undefined
    });
  }

  /**
   * Update an existing contract
   */
  static async updateContract(id, { tanggalMulai, tanggalSelesai, keterangan, fileUrl, namaFile, nomorKontrak, golongan, gajiPokok, mkTahun, mkBulan }) {
    const existing = await KontrakRepository.findById(id);
    if (!existing || existing.isDeleted) {
      const error = new Error('Riwayat kontrak tidak ditemukan');
      error.status = 404;
      throw error;
    }

    return KontrakRepository.update(id, {
      tanggalMulai,
      tanggalSelesai,
      keterangan,
      fileUrl,
      namaFile,
      nomorKontrak,
      golongan,
      gajiPokok,
      mkTahun: mkTahun !== undefined ? parseInt(mkTahun) : undefined,
      mkBulan: mkBulan !== undefined ? parseInt(mkBulan) : undefined
    });
  }

  /**
   * Delete a contract (soft delete)
   */
  static async deleteContract(id) {
    const existing = await KontrakRepository.findById(id);
    if (!existing || existing.isDeleted) {
      const error = new Error('Riwayat kontrak tidak ditemukan');
      error.status = 404;
      throw error;
    }

    return KontrakRepository.softDelete(id);
  }
}
