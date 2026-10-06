import { verifikasiRepository } from './verifikasi.repository.js';
import activityLogService from '../activity-log/activityLog.service.js';
import { STATUS_PERBAIKAN } from '../portal-perbaikan/perbaikan.constants.js';

export const verifikasiService = {
  async getInbox(query) {
    return verifikasiRepository.findInbox({
      status: query.status,
      kategori: query.kategori,
      jenisPegawai: query.jenisPegawai,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 10
    });
  },

  async getStatistik() {
    return verifikasiRepository.getStatistik();
  },

  async getDetail(id) {
    const usulan = await verifikasiRepository.findById(id);
    if (!usulan) {
      const err = new Error('Usulan perbaikan tidak ditemukan');
      err.status = 404;
      throw err;
    }
    return usulan;
  },

  async prosesUsulan(id, userId, catatan) {
    const usulan = await this.getDetail(id);

    if (usulan.status !== STATUS_PERBAIKAN.DIAJUKAN) {
      const err = new Error(`Hanya usulan dengan status DIAJUKAN yang dapat diproses (Status saat ini: ${usulan.status})`);
      err.status = 400;
      throw err;
    }

    const result = await verifikasiRepository.updateStatus(id, {
      statusLama: usulan.status,
      statusBaru: STATUS_PERBAIKAN.DIPROSES,
      catatan: catatan || 'Usulan sedang diproses dan diverifikasi oleh verifikator',
      verifikatorId: userId,
      userId
    });

    activityLogService.logActivity(
      userId,
      'PROSES_VERIFIKASI',
      'UsulanPerbaikanData',
      id,
      { nomorUsulan: usulan.nomorUsulan }
    );

    return result;
  },

  async mintaPerbaikan(id, userId, catatan) {
    const usulan = await this.getDetail(id);

    if (![STATUS_PERBAIKAN.DIAJUKAN, STATUS_PERBAIKAN.DIPROSES].includes(usulan.status)) {
      const err = new Error(`Usulan dengan status ${usulan.status} tidak dapat dikembalikan untuk perbaikan`);
      err.status = 400;
      throw err;
    }

    const result = await verifikasiRepository.updateStatus(id, {
      statusLama: usulan.status,
      statusBaru: STATUS_PERBAIKAN.PERLU_PERBAIKAN,
      catatan,
      verifikatorId: userId,
      userId
    });

    activityLogService.logActivity(
      userId,
      'MINTA_REVISI_PERBAIKAN',
      'UsulanPerbaikanData',
      id,
      { nomorUsulan: usulan.nomorUsulan, catatan }
    );

    return result;
  },

  async tolakUsulan(id, userId, catatan) {
    const usulan = await this.getDetail(id);

    if (![STATUS_PERBAIKAN.DIAJUKAN, STATUS_PERBAIKAN.DIPROSES].includes(usulan.status)) {
      const err = new Error(`Usulan dengan status ${usulan.status} tidak dapat ditolak`);
      err.status = 400;
      throw err;
    }

    const result = await verifikasiRepository.updateStatus(id, {
      statusLama: usulan.status,
      statusBaru: STATUS_PERBAIKAN.DITOLAK,
      catatan,
      verifikatorId: userId,
      userId
    });

    activityLogService.logActivity(
      userId,
      'TOLAK_PERBAIKAN',
      'UsulanPerbaikanData',
      id,
      { nomorUsulan: usulan.nomorUsulan, catatan }
    );

    return result;
  },

  async setujuiUsulan(id, userId, catatan) {
    const usulan = await this.getDetail(id);

    if (![STATUS_PERBAIKAN.DIAJUKAN, STATUS_PERBAIKAN.DIPROSES].includes(usulan.status)) {
      const err = new Error(`Usulan dengan status ${usulan.status} tidak dapat disetujui`);
      err.status = 400;
      throw err;
    }

    const result = await verifikasiRepository.applyPersetujuan({
      usulan,
      catatan,
      verifikatorId: userId
    });

    activityLogService.logActivity(
      userId,
      'SETUJUI_PERBAIKAN',
      'UsulanPerbaikanData',
      id,
      {
        nomorUsulan: usulan.nomorUsulan,
        kategori: usulan.kategori,
        aksi: usulan.aksi
      }
    );

    return result;
  }
};
