import { MasalahPegawaiRepository } from './masalah-pegawai.repository.js';
import prisma from '../../config/database.js';
import * as XLSX from 'xlsx';

export class MasalahPegawaiService {
  static async getAllMasalah(queryParams) {
    return await MasalahPegawaiRepository.findAll(queryParams);
  }

  static async getMasalahById(id) {
    const data = await MasalahPegawaiRepository.findById(id);
    if (!data) {
      const err = new Error('Catatan masalah pegawai tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }
    return data;
  }

  static async getMasalahByPegawai(dataP3kId) {
    return await MasalahPegawaiRepository.findByDataP3kId(dataP3kId);
  }

  static async getRekapStats() {
    return await MasalahPegawaiRepository.getRekapStats();
  }

  static async getNextNomorKasus() {
    return await MasalahPegawaiRepository.generateNomorKasus();
  }

  static async createMasalah(data, files, userId) {
    // Verify pegawai exists
    const pegawai = await prisma.dataP3k.findFirst({
      where: { id: data.dataP3kId, isDeleted: false },
      select: { id: true, nama: true }
    });

    if (!pegawai) {
      const err = new Error('Pegawai (Data P3K) tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    // Verify category exists
    const kategori = await prisma.kategoriMasalah.findFirst({
      where: { id: data.kategoriId, isDeleted: false },
      select: { id: true, nama: true }
    });

    if (!kategori) {
      const err = new Error('Kategori masalah tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    return await MasalahPegawaiRepository.create(data, files, userId);
  }

  static async updateMasalah(id, data, files, userId) {
    await this.getMasalahById(id);

    if (data.kategoriId) {
      const kategori = await prisma.kategoriMasalah.findFirst({
        where: { id: data.kategoriId, isDeleted: false }
      });
      if (!kategori) {
        const err = new Error('Kategori masalah tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }
    }

    return await MasalahPegawaiRepository.update(id, data, files, userId);
  }

  static async addTindakLanjut(id, data, userId) {
    await this.getMasalahById(id);
    return await MasalahPegawaiRepository.addTindakLanjut(id, data, userId);
  }

  static async deleteMasalah(id) {
    await this.getMasalahById(id);
    return await MasalahPegawaiRepository.softDelete(id);
  }

  static async deleteLampiran(lampiranId) {
    return await MasalahPegawaiRepository.deleteLampiran(lampiranId);
  }

  static async exportToExcel(queryParams) {
    // Fetch all records matching filter without pagination limit
    const result = await MasalahPegawaiRepository.findAll({
      ...queryParams,
      page: 1,
      limit: 10000
    });

    const rows = result.data.map((item, index) => {
      const tgl = item.tanggalKejadian
        ? new Date(item.tanggalKejadian).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : '-';

      const tglSelesai = item.tanggalSelesai
        ? new Date(item.tanggalSelesai).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : '-';

      return {
        No: index + 1,
        'Nomor Kasus': item.nomorKasus,
        'NIP Pegawai': item.dataP3k?.nipBaru || '-',
        'Nama Pegawai': item.dataP3k?.nama || '-',
        Jabatan: item.dataP3k?.jabatanNama || '-',
        'Unit Kerja': item.dataP3k?.unorNama || '-',
        'Unit Kerja Induk': item.dataP3k?.unorInduk?.nama || '-',
        Kategori: item.kategori?.nama || '-',
        'Judul Kasus': item.judul,
        'Tingkat Keparahan': item.tingkatKeparahan,
        Status: item.status,
        'Tanggal Kejadian': tgl,
        'Ringkasan/Tindak Lanjut': item.ringkasanMasalah || item.tindakLanjut || '-',
        'Catatan Penyelesaian': item.catatanPenyelesaian || '-',
        'Tanggal Selesai': tglSelesai,
        'Dicatat Oleh': item.createdBy?.namaLengkap || item.createdBy?.username || '-'
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const colWidths = [
      { wch: 6 },  // No
      { wch: 22 }, // Nomor Kasus
      { wch: 22 }, // NIP
      { wch: 30 }, // Nama
      { wch: 30 }, // Jabatan
      { wch: 35 }, // Unit Kerja
      { wch: 30 }, // Unit Kerja Induk
      { wch: 25 }, // Kategori
      { wch: 35 }, // Judul
      { wch: 18 }, // Keparahan
      { wch: 15 }, // Status
      { wch: 18 }, // Tanggal Kejadian
      { wch: 40 }, // Ringkasan
      { wch: 35 }, // Catatan Penyelesaian
      { wch: 18 }, // Tanggal Selesai
      { wch: 25 }  // Dicatat Oleh
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Masalah Pegawai');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
