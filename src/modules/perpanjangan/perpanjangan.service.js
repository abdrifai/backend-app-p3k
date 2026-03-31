import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { PerpanjanganRepository } from './perpanjangan.repository.js';
import { DataP3kRepository } from '../data-p3k/data-p3k.repository.js';
import { KontrakRepository } from '../kontrak/kontrak.repository.js';
import { GajiService } from '../gaji/gaji.service.js';
import TaskUsulanRepository from '../task-usulan/task-usulan.repository.js';

export class PerpanjanganService {
  // --- Template ---
  static async getAllTemplates() {
    return PerpanjanganRepository.findAllTemplates();
  }

  static async createTemplate({ nama, deskripsi, fileUrl, namaFile }) {
    return PerpanjanganRepository.createTemplate({ nama, deskripsi, fileUrl, namaFile });
  }

  static async deleteTemplate(id) {
    const tpl = await PerpanjanganRepository.findTemplateById(id);
    if (!tpl || tpl.isDeleted) {
      const error = new Error('Template tidak ditemukan');
      error.status = 404;
      throw error;
    }
    return PerpanjanganRepository.deleteTemplate(id);
  }

  // --- Usulan ---
  static async getAllUsulan({ page = 1, limit = 10, status = '', search = '', userId, isAdmin }) {
    const skip = (page - 1) * limit;
    const { data, total } = await PerpanjanganRepository.findAllUsulan({ skip, take: limit, status, search, userId, isAdmin });
    
    // Map with additional calculated data (gaji, etc)
    const mappedData = await Promise.all(data.map(async (u) => {
      const templateData = await this._getTemplateData(u);
      return { 
        ...u, 
        calculatedData: templateData 
      };
    }));

    return {
      data: mappedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  static async createUsulan({ nipBaru, tanggalMulai, tanggalSelesai, keterangan, templateKontrakId, nomorKontrak, tanggalTtd, kontrakKe }, userId) {
    const dataP3k = await DataP3kRepository.findByNipBaru(nipBaru);
    if (!dataP3k) {
      const error = new Error('Data P3K tidak ditemukan');
      error.status = 404;
      throw error;
    }

    if (templateKontrakId) {
      const tpl = await PerpanjanganRepository.findTemplateById(templateKontrakId);
      if (!tpl || tpl.isDeleted) {
        const error = new Error('Template kontrak tidak ditemukan');
        error.status = 404;
        throw error;
      }
    }

    if (nomorKontrak) {
      const isTaken = await PerpanjanganRepository.checkNomorExists(nomorKontrak);
      if (isTaken) {
        const error = new Error('Nomor kontrak sudah digunakan. Mohon gunakan nomor lain atau refresh untuk mendapatkan nomor terbaru.');
        error.status = 400;
        throw error;
      }
    }

    const newUsulan = await PerpanjanganRepository.createUsulan({
      dataP3kId: dataP3k.id,
      tanggalMulai,
      tanggalSelesai,
      keterangan,
      templateKontrakId,
      nomorKontrak,
      tanggalTtd,
      kontrakKe: kontrakKe ? parseInt(kontrakKe) : null,
      editedById: userId
    });

    // Mark task as completed if there's any pending task for this dataP3k
    if (userId) {
      await TaskUsulanRepository.completeTaskByDataP3kId(dataP3k.id, userId);
    }

    return newUsulan;
  }

  static async updateUsulan(id, { tanggalMulai, tanggalSelesai, keterangan, templateKontrakId, nomorKontrak, tanggalTtd, kontrakKe }) {
    const usulan = await PerpanjanganRepository.findUsulanById(id);
    if (!usulan || usulan.isDeleted) {
      const error = new Error('Usulan tidak ditemukan');
      error.status = 404;
      throw error;
    }

    if (usulan.status !== 'REJECTED') {
      const error = new Error('Hanya usulan yang ditolak yang dapat diedit');
      error.status = 400;
      throw error;
    }

    if (templateKontrakId) {
      const tpl = await PerpanjanganRepository.findTemplateById(templateKontrakId);
      if (!tpl || tpl.isDeleted) {
        const error = new Error('Template kontrak tidak ditemukan');
        error.status = 404;
        throw error;
      }
    }

    if (nomorKontrak && nomorKontrak !== usulan.nomorKontrak) {
      const isTaken = await PerpanjanganRepository.checkNomorExists(nomorKontrak);
      if (isTaken) {
        const error = new Error('Nomor kontrak sudah digunakan. Mohon gunakan nomor lain.');
        error.status = 400;
        throw error;
      }
    }

    return PerpanjanganRepository.updateUsulan(id, {
      tanggalMulai,
      tanggalSelesai,
      keterangan,
      templateKontrakId,
      nomorKontrak,
      tanggalTtd,
      kontrakKe: kontrakKe ? parseInt(kontrakKe) : null,
      status: 'PENDING',
      alasanPenolakan: null
    });
  }

  static async approveUsulan(id) {
    const usulan = await PerpanjanganRepository.findUsulanById(id);
    if (!usulan || usulan.isDeleted) {
      const error = new Error('Usulan tidak ditemukan');
      error.status = 404;
      throw error;
    }
    if (usulan.status !== 'PENDING') {
      const error = new Error('Usulan sudah diproses sebelumnya');
      error.status = 400;
      throw error;
    }

    let generatedFileUrl = null;

    // Generate Word document if template is attached
    if (usulan.templateKontrak && usulan.templateKontrak.fileUrl) {
      generatedFileUrl = await this._generateDocument(usulan);
    }

    // Update status to APPROVED
    const updated = await PerpanjanganRepository.updateUsulanStatus(id, {
      status: 'APPROVED',
      generatedFileUrl
    });

    // Get additional data for history
    const templateData = await this._getTemplateData(usulan);
    const gajiNumeric = templateData.gaji ? parseFloat(templateData.gaji.replace(/[^0-9]/g, '')) : 0;

    // Also create entry in riwayat kontrak
    const latestKe = await KontrakRepository.getLatestKontrakKe(usulan.dataP3kId);
    await KontrakRepository.create({
      dataP3kId: usulan.dataP3kId,
      kontrakKe: usulan.kontrakKe !== null && usulan.kontrakKe !== undefined ? usulan.kontrakKe : (latestKe + 1),
      tanggalMulai: usulan.tanggalMulai,
      tanggalSelesai: usulan.tanggalSelesai,
      keterangan: usulan.keterangan || `Perpanjangan kontrak (dari usulan)`,
      fileUrl: generatedFileUrl,
      namaFile: generatedFileUrl ? path.basename(generatedFileUrl) : null,
      nomorKontrak: usulan.nomorKontrak,
      mkTahun: (templateData.mkTahun !== undefined && templateData.mkTahun !== null) ? parseInt(templateData.mkTahun) : null,
      mkBulan: (templateData.mkBulan !== undefined && templateData.mkBulan !== null) ? parseInt(templateData.mkBulan) : null,
      gajiPokok: gajiNumeric,
      golongan: templateData.golongan
    });

    return updated;
  }

  static async rejectUsulan(id, alasanPenolakan) {
    const usulan = await PerpanjanganRepository.findUsulanById(id);
    if (!usulan || usulan.isDeleted) {
      const error = new Error('Usulan tidak ditemukan');
      error.status = 404;
      throw error;
    }
    if (usulan.status !== 'PENDING') {
      const error = new Error('Usulan sudah diproses sebelumnya');
      error.status = 400;
      throw error;
    }

    return PerpanjanganRepository.updateUsulanStatus(id, {
      status: 'REJECTED',
      alasanPenolakan
    });
  }

  static async uploadFinalDocument(id, finalFileUrl) {
    const usulan = await PerpanjanganRepository.findUsulanById(id);
    if (!usulan || usulan.isDeleted) {
      const error = new Error('Usulan tidak ditemukan');
      error.status = 404;
      throw error;
    }

    if (usulan.generatedFileUrl) {
      // 1. Physically delete the generated Word doc
      try {
        const filePath = path.join(process.cwd(), usulan.generatedFileUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting generated Word document:', err);
      }

      // 2. Update Riwayat Kontrak to point to the new PDF and sync metadata
      try {
        const templateData = await this._getTemplateData(usulan);
        const gajiNumeric = templateData.gaji ? parseFloat(templateData.gaji.replace(/[^0-9]/g, '')) : 0;

        await KontrakRepository.updateFileByUsulanMatch(
          usulan.dataP3kId,
          usulan.tanggalMulai,
          usulan.tanggalSelesai,
          usulan.keterangan || `Perpanjangan kontrak (dari usulan)`,
          usulan.generatedFileUrl,
          finalFileUrl,
          path.basename(finalFileUrl),
          {
            nomorKontrak: usulan.nomorKontrak,
            mkTahun: (templateData.mkTahun !== undefined && templateData.mkTahun !== null) ? parseInt(templateData.mkTahun) : null,
            mkBulan: (templateData.mkBulan !== undefined && templateData.mkBulan !== null) ? parseInt(templateData.mkBulan) : null,
            gajiPokok: gajiNumeric,
            golongan: templateData.golongan
          }
        );
      } catch (err) {
        console.error('Error updating riwayat kontrak file link and metadata:', err);
      }
    }

    return PerpanjanganRepository.updateUsulanStatus(id, {
      status: 'SELESAI',
      finalFileUrl,
      generatedFileUrl: null
    });
  }

  static async processToSrikandi(id) {
    const usulan = await PerpanjanganRepository.findUsulanById(id);
    if (!usulan || usulan.isDeleted) {
      const error = new Error('Usulan tidak ditemukan');
      error.status = 404;
      throw error;
    }

    if (usulan.status !== 'APPROVED') {
      const error = new Error('Usulan harus dalam status disetujui untuk diproses ke Srikandi');
      error.status = 400;
      throw error;
    }

    return PerpanjanganRepository.updateUsulanStatus(id, {
      status: 'UPLOAD_SRIKANDI'
    });
  }

  static async deleteUsulan(id) {
    const usulan = await PerpanjanganRepository.findUsulanById(id);
    if (!usulan || usulan.isDeleted) {
      const error = new Error('Usulan tidak ditemukan');
      error.status = 404;
      throw error;
    }

    // Delete associated task to allow redistribution
    await TaskUsulanRepository.deleteTaskByDataP3kId(usulan.dataP3kId);

    return PerpanjanganRepository.deleteUsulan(id);
  }

  static async deleteApprovedUsulan(id) {
    const usulan = await PerpanjanganRepository.findUsulanById(id);
    if (!usulan || usulan.isDeleted) {
      const error = new Error('Usulan tidak ditemukan');
      error.status = 404;
      throw error;
    }
    
    // Attempt to delete the corresponding riwayat kontrak entry
    try {
      await KontrakRepository.deleteByUsulanMatch(
        usulan.dataP3kId,
        usulan.tanggalMulai,
        usulan.tanggalSelesai,
        usulan.keterangan,
        usulan.finalFileUrl || usulan.generatedFileUrl
      );
    } catch (err) {
      console.error('Error deleting riwayat kontrak:', err);
    }

    // Delete generated word file if exists
    if (usulan.generatedFileUrl) {
      try {
        const filePath = path.join(process.cwd(), usulan.generatedFileUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting word file:', err);
      }
    }

    // Delete final PDF file if exists
    if (usulan.finalFileUrl) {
      try {
        const filePath = path.join(process.cwd(), usulan.finalFileUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting PDF file:', err);
      }
    }

    // Delete associated task to allow redistribution
    await TaskUsulanRepository.deleteTaskByDataP3kId(usulan.dataP3kId);

    return PerpanjanganRepository.deleteUsulan(id);
  }

  static _formatTanggal(dateString) {
    if (!dateString) return '';
    try {
      const date = this._parseDate(dateString);
      if (!date || isNaN(date.getTime())) return dateString;
      
      const d = date.getDate();
      const m = date.getMonth();
      const y = date.getFullYear();
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      
      return `${d < 10 ? '0' + d : d} ${months[m]} ${y}`;
    } catch (e) {
      return dateString;
    }
  }

  static _angkaTerbilang(angka, useRupiah = true) {
    if (!angka && angka !== 0) return '';
    const bil = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    
    let n = Math.abs(angka);
    let str = "";
    
    if (n < 12) {
      str = bil[n];
    } else if (n < 20) {
      str = this._angkaTerbilang(n - 10, false) + " Belas";
    } else if (n < 100) {
      str = this._angkaTerbilang(Math.floor(n / 10), false) + " Puluh " + this._angkaTerbilang(n % 10, false);
    } else if (n < 200) {
      str = "Seratus " + this._angkaTerbilang(n - 100, false);
    } else if (n < 1000) {
      str = this._angkaTerbilang(Math.floor(n / 100), false) + " Ratus " + this._angkaTerbilang(n % 100, false);
    } else if (n < 2000) {
      str = "Seribu " + this._angkaTerbilang(n - 1000, false);
    } else if (n < 1000000) {
      str = this._angkaTerbilang(Math.floor(n / 1000), false) + " Ribu " + this._angkaTerbilang(n % 1000, false);
    } else if (n < 1000000000) {
      str = this._angkaTerbilang(Math.floor(n / 1000000), false) + " Juta " + this._angkaTerbilang(n % 1000000, false);
    } else {
      return n.toString(); // Too large
    }
    
    return str.trim() + (useRupiah && angka > 0 && n === angka && typeof str === 'string' && str.trim().length > 0 && !str.includes("Rupiah") ? " Rupiah" : "");
  }

  static _formatTanggalTerbilang(dateString) {
    if (!dateString) return '';
    try {
      const date = this._parseDate(dateString);
      if (!date || isNaN(date.getTime())) return '';
      
      const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
      const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
      
      const dayName = days[date.getDay()];
      const dateNum = date.getDate();
      const monthName = months[date.getMonth()];
      const yearNum = date.getFullYear();
      
      const dateText = this._angkaTerbilang(dateNum, false).toLowerCase();
      const yearText = this._angkaTerbilang(yearNum, false).toLowerCase();
      
      return `hari ini ${dayName} tanggal ${dateText} bulan ${monthName} tahun ${yearText}`;
    } catch(e) {
      return '';
    }
  }

  /**
   * Generate a Word document from template with employee data placeholders.
   */
  static async _generateDocument(usulan) {
    const templatePath = path.resolve(usulan.templateKontrak.fileUrl.replace(/^\//, ''));
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`File template tidak ditemukan: ${templatePath}`);
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    let doc;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true
      });
    } catch (error) {
      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors.map(function (error) {
          return error.properties.explanation;
        }).join("\\n");
        console.error("Docxtemplater MultiError:", errorMessages);
        throw new Error("Gagal memproses template: " + errorMessages);
      }
      throw error;
    }

    const templateData = await this._getTemplateData(usulan);
    doc.setData(templateData);

    try {
      doc.render();
    } catch (error) {
      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors.map(function (error) {
          return error.properties.explanation;
        }).join("\\n");
        console.error("Docxtemplater Render Error:", errorMessages);
        throw new Error("Template error: " + errorMessages);
      }
      throw error;
    }

    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    
    // Save generated file
    const outDir = 'uploads/generated-kontrak';
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    
    const pegawai = usulan.dataP3k || {};
    const sanitizedName = (pegawai.nama || 'pegawai').replace(/[^a-zA-Z0-9]/g, '_');
    
    // Format penamaan file yang digenerate. Ubah formatnya di bawah ini:
    const fileName = `${sanitizedName}_${pegawai.nipBaru || 'nonip'}.docx`;
    const filePath = path.join(outDir, fileName);
    
    fs.writeFileSync(filePath, buf);

    return `/${filePath}`;
  }

  /**
   * Generate document for a specific usulan (manual re-generate or download)
   */
  static async generateDocument(id) {
    const usulan = await PerpanjanganRepository.findUsulanById(id);
    if (!usulan || usulan.isDeleted) {
      const error = new Error('Usulan tidak ditemukan');
      error.status = 404;
      throw error;
    }

    if (!usulan.templateKontrak) {
      const error = new Error('Tidak ada template yang terhubung dengan usulan ini');
      error.status = 400;
      throw error;
    }

    const generatedFileUrl = await this._generateDocument(usulan);
    
    // Update the usulan with new generated file
    await PerpanjanganRepository.updateUsulanStatus(id, {
      status: usulan.status,
      generatedFileUrl
    });

    return generatedFileUrl;
  }

  /**
   * Mengambil data placeholder template untuk preview tanpa generate dokumen
   */
  static async getPreviewData(id) {
    const usulan = await PerpanjanganRepository.findUsulanById(id);
    if (!usulan || usulan.isDeleted) {
      const error = new Error('Usulan tidak ditemukan');
      error.status = 404;
      throw error;
    }
    
    return await this._getTemplateData(usulan);
  }

  /**
   * Parse date string DD/MM/YYYY or YYYY-MM-DD safely
   */
  static _parseDate(dateStr) {
    if (!dateStr) return null;
    if (typeof dateStr !== 'string') return new Date(dateStr);
    
    // Handle DD/MM/YYYY or DD-MM-YYYY
    const separator = dateStr.includes('/') ? '/' : (dateStr.includes('-') && dateStr.split('-')[0].length <= 2 ? '-' : null);
    
    if (separator) {
      const parts = dateStr.split(separator);
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const y = parseInt(parts[2], 10);
        
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
          return new Date(y, m, d);
        }
      }
    }
    return new Date(dateStr);
  }

  /**
   * Helper function untuk mengkalkulasi 14 variabel placeholder template
   */
  static async _getTemplateData(usulan) {
    const pegawai = usulan.dataP3k;

    // Hitung Masa Kerja (Tahun & Bulan) secara presisi dari TMT CPNS ke Tanggal Mulai Kontrak Baru
    let mkTahunHitung = 0;
    let mkBulanHitung = 0;

    if (usulan.tanggalMulai && pegawai.tmtCpns) {
      const start = this._parseDate(pegawai.tmtCpns);
      const end = this._parseDate(usulan.tanggalMulai);
      
      if (start && !isNaN(start.getTime()) && end && !isNaN(end.getTime())) {
        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        
        if (months < 0) {
          years--;
          months += 12;
        }
        
        mkTahunHitung = Math.max(0, years);
        mkBulanHitung = Math.max(0, months);
      }
    }

    // Lookup Gaji berdasarkan golongan dan mkTahun
    let gajiPokok = 0;
    let terbilang = "";
    let gajiFormatted = "0";
    
    // Safety check map golongan
    const golonganStr = pegawai.golAkhirNama || pegawai.golAwalNama || '';

    if (golonganStr) {
      const gajiRef = await GajiService.lookup(golonganStr, mkTahunHitung);
      if (gajiRef) {
        gajiPokok = gajiRef.gaji;
        gajiFormatted = `Rp.${new Intl.NumberFormat('id-ID').format(gajiPokok)},-`;
        terbilang = this._angkaTerbilang(gajiPokok);
      }
    }

    // Determine unit kerja name safely handling nested references
    const unitKerjaNama = pegawai.unorInduk?.nama || pegawai.unorNama || '';

    return {
      nipBaru: pegawai.nipBaru || '',
      nama: pegawai.nama || '',
      jabatanNama: pegawai.jabatanNama || '',
      tempatLahirNama: pegawai.tempatLahirNama || '',
      tanggalLahir: this._formatTanggal(pegawai.tanggalLahir),
      pendidikanNama: pegawai.pendidikanNama || '',
      tahunLulus: pegawai.tahunLulus || '',
      alamat: pegawai.alamat || '',
      golonganAkhirNama: golonganStr,
      golongan: golonganStr, // Alias untuk template docx
      unitKerja: unitKerjaNama, // Alias untuk template docx
      mkTahun: mkTahunHitung.toString(),
      mkBulan: mkBulanHitung.toString(),
      gaji: gajiFormatted,
      terbilang: terbilang,
      nomorKontrak: usulan.nomorKontrak || '',
      tanggalTtd: this._formatTanggal(usulan.tanggalTtd),
      tanggalTtdText: this._formatTanggalTerbilang(usulan.tanggalTtd),
      tmtCpns: this._formatTanggal(this._parseDate(pegawai.tmtCpns)),
      
      // Fallback
      tanggalMulai: this._formatTanggal(this._parseDate(usulan.tanggalMulai)),
      tanggalSelesai: this._formatTanggal(this._parseDate(usulan.tanggalSelesai)),
      keterangan: usulan.keterangan || '',
      tanggalHariIni: this._formatTanggal(new Date().toISOString().split('T')[0]),
      
      // Bypass ttd_pengirim
      ttd_pengirim1: '{ttd_pengirim1}',
      ttd_pengirim2: '{ttd_pengirim2}'
    };
  }

  static async getNextContractNumber(nipBaru) {
    const pegawai = await DataP3kRepository.findByNipBaru(nipBaru);
    if (!pegawai) {
      const error = new Error('Pegawai tidak ditemukan');
      error.status = 404;
      throw error;
    }

    const year = new Date().getFullYear();
    const maxSeq = await PerpanjanganRepository.findMaxSequence(year);
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');

    // Determine type
    // PPPK.Ts for teknis, PPPK.Ns for nakes, PPPK.Gr for guru
    let type = 'PPPK.Ts'; // Default decimal/technical
    const jabatanLower = (pegawai.jabatanNama || '').toLowerCase();

    if (jabatanLower.includes('guru')) {
      type = 'PPPK.Gr';
    } else if (
      jabatanLower.includes('perawat') || 
      jabatanLower.includes('bidan') || 
      jabatanLower.includes('dokter') || 
      jabatanLower.includes('kesehatan') ||
      jabatanLower.includes('apoteker') ||
      jabatanLower.includes('nutrisionis') ||
      jabatanLower.includes('sanitarian') ||
      jabatanLower.includes('radiografer') ||
      jabatanLower.includes('laboratorium')
    ) {
      type = 'PPPK.Ns';
    }

    // Format: 800.1.13.2/0001/PPPK.Ts/BKPSDMD-B.TU/2026
    const nomorKontrak = `800.1.13.2/${nextSeq}/${type}/BKPSDMD-B.TU/${year}`;
    
    return { nomorKontrak, nextSeq, type, year };
  }
}
