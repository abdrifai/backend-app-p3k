import { perbaikanRepository } from './perbaikan.repository.js';
import { ATURAN_PERBAIKAN, KATEGORI_PERBAIKAN, AKSI_PERBAIKAN, STATUS_PERBAIKAN } from './perbaikan.constants.js';
import activityLogService from '../activity-log/activityLog.service.js';

export const perbaikanService = {
  getAturan() {
    return ATURAN_PERBAIKAN;
  },

  async getDaftarUsulan(pegawai, query) {
    const filter = {
      ...(pegawai.jenis === 'PENUH_WAKTU' ? { dataP3kId: pegawai.id } : { dataP3kParuhWaktuId: pegawai.id }),
      status: query.status,
      kategori: query.kategori,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 10
    };
    return perbaikanRepository.findManyByPegawai(filter);
  },

  async getDetailUsulan(pegawai, id) {
    const filter = pegawai.jenis === 'PENUH_WAKTU' 
      ? { dataP3kId: pegawai.id } 
      : { dataP3kParuhWaktuId: pegawai.id };
    
    const usulan = await perbaikanRepository.findByIdAndPegawai(id, filter);
    if (!usulan) {
      const err = new Error('Usulan perbaikan tidak ditemukan');
      err.status = 404;
      throw err;
    }
    return usulan;
  },

  async buatUsulan(pegawai, userId, payload, files = []) {
    const { kategori, aksi, targetId, dataBaru: rawDataBaru, alasan } = payload;
    const aturan = ATURAN_PERBAIKAN[kategori];

    if (!aturan) {
      const err = new Error('Kategori perbaikan tidak valid');
      err.status = 400;
      throw err;
    }

    if (!aturan.aksiDiizinkan.includes(aksi)) {
      const err = new Error(`Aksi ${aksi} tidak diizinkan untuk kategori ${kategori}`);
      err.status = 400;
      throw err;
    }

    // Filter dataBaru sesuai whitelist
    let filteredDataBaru = {};
    if (aksi !== AKSI_PERBAIKAN.HAPUS) {
      const dataInput = typeof rawDataBaru === 'string' ? JSON.parse(rawDataBaru) : (rawDataBaru || {});
      const keys = Object.keys(dataInput);
      for (const key of keys) {
        if (aturan.fieldDiizinkan.includes(key)) {
          filteredDataBaru[key] = dataInput[key];
        }
      }

      if (Object.keys(filteredDataBaru).length === 0) {
        const err = new Error(`Data usulan tidak valid. Field yang diizinkan hanya: ${aturan.fieldDiizinkan.join(', ')}`);
        err.status = 400;
        throw err;
      }
    }

    // Validasi lampiran wajib
    if (aturan.lampiranWajib && (!files || files.length === 0)) {
      const err = new Error(`Lampiran bukti pendukung wajib diunggah untuk usulan ${aturan.label}`);
      err.status = 400;
      throw err;
    }

    // Cek targetId untuk aksi UBAH atau HAPUS
    if ((aksi === AKSI_PERBAIKAN.UBAH || aksi === AKSI_PERBAIKAN.HAPUS) && kategori !== KATEGORI_PERBAIKAN.DATA_UTAMA && kategori !== KATEGORI_PERBAIKAN.SK_PENGANGKATAN) {
      if (!targetId) {
        const err = new Error('Target data yang akan diubah/dihapus wajib ditentukan');
        err.status = 400;
        throw err;
      }
    }

    // Cegah duplikasi usulan aktif
    const activeCount = await perbaikanRepository.countActivePending({
      dataP3kId: pegawai.jenis === 'PENUH_WAKTU' ? pegawai.id : undefined,
      dataP3kParuhWaktuId: pegawai.jenis === 'PARUH_WAKTU' ? pegawai.id : undefined,
      kategori,
      targetId: targetId || null
    });

    if (activeCount > 0) {
      const err = new Error('Masih ada usulan yang sedang aktif/berjalan untuk data ini');
      err.status = 400;
      throw err;
    }

    // Ambil dataLama secara otomatis dari database
    const dataLama = await perbaikanRepository.getDataLama({
      jenisPegawai: pegawai.jenis,
      idPegawai: pegawai.id,
      kategori,
      targetId: targetId || null
    });

    if ((aksi === AKSI_PERBAIKAN.UBAH || aksi === AKSI_PERBAIKAN.HAPUS) && !dataLama) {
      const err = new Error('Data referensi yang akan diperbaiki tidak ditemukan di sistem');
      err.status = 404;
      throw err;
    }

    const nomorUsulan = await perbaikanRepository.generateNomorUsulan();

    const lampiranList = (files || []).map(file => ({
      namaFile: file.originalname,
      fileUrl: `/uploads/perbaikan/${file.filename}`,
      fileType: file.mimetype,
      fileSize: file.size
    }));

    const usulanData = {
      nomorUsulan,
      ...(pegawai.jenis === 'PENUH_WAKTU' ? { dataP3kId: pegawai.id } : { dataP3kParuhWaktuId: pegawai.id }),
      kategori,
      aksi,
      targetId: targetId || null,
      dataLama: dataLama ? JSON.parse(JSON.stringify(dataLama)) : null,
      dataBaru: filteredDataBaru,
      alasan,
      status: STATUS_PERBAIKAN.DIAJUKAN
    };

    const result = await perbaikanRepository.createUsulan({
      data: usulanData,
      lampiranList,
      userId
    });

    activityLogService.logActivity(
      userId,
      'AJUKAN_PERBAIKAN',
      'UsulanPerbaikanData',
      result.id,
      { nomorUsulan, kategori, aksi }
    );

    return result;
  },

  async revisiUsulan(pegawai, userId, id, payload, files = []) {
    const existing = await this.getDetailUsulan(pegawai, id);
    if (existing.status !== STATUS_PERBAIKAN.PERLU_PERBAIKAN) {
      const err = new Error('Hanya usulan dengan status PERLU_PERBAIKAN yang dapat direvisi');
      err.status = 400;
      throw err;
    }

    const aturan = ATURAN_PERBAIKAN[existing.kategori];
    const rawDataBaru = payload.dataBaru;
    const dataInput = typeof rawDataBaru === 'string' ? JSON.parse(rawDataBaru) : (rawDataBaru || {});
    
    let filteredDataBaru = {};
    for (const key of Object.keys(dataInput)) {
      if (aturan.fieldDiizinkan.includes(key)) {
        filteredDataBaru[key] = dataInput[key];
      }
    }

    if (Object.keys(filteredDataBaru).length === 0) {
      const err = new Error(`Data usulan revisi tidak valid. Field yang diizinkan: ${aturan.fieldDiizinkan.join(', ')}`);
      err.status = 400;
      throw err;
    }

    const lampiranList = (files || []).map(file => ({
      namaFile: file.originalname,
      fileUrl: `/uploads/perbaikan/${file.filename}`,
      fileType: file.mimetype,
      fileSize: file.size
    }));

    const result = await perbaikanRepository.updateRevisi(id, {
      dataBaru: filteredDataBaru,
      alasan: payload.alasan,
      lampiranList,
      userId
    });

    activityLogService.logActivity(
      userId,
      'REVISI_PERBAIKAN',
      'UsulanPerbaikanData',
      id,
      { nomorUsulan: existing.nomorUsulan }
    );

    return result;
  },

  async batalkanUsulan(pegawai, userId, id) {
    const existing = await this.getDetailUsulan(pegawai, id);
    if (existing.status !== STATUS_PERBAIKAN.DIAJUKAN) {
      const err = new Error('Hanya usulan dengan status DIAJUKAN yang dapat dibatalkan');
      err.status = 400;
      throw err;
    }

    const result = await perbaikanRepository.cancelUsulan(id, userId);

    activityLogService.logActivity(
      userId,
      'BATALKAN_PERBAIKAN',
      'UsulanPerbaikanData',
      id,
      { nomorUsulan: existing.nomorUsulan }
    );

    return result;
  }
};
