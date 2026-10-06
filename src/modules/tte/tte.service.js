import { tteRepository } from './tte.repository.js';
import bsreClient from './bsre.client.js';
import { STATUS_TTE, TAHAP_TTE, JENIS_TTE, JABATAN_PEJABAT } from './bsre.constants.js';
import activityLogService from '../activity-log/activityLog.service.js';

export const tteService = {
  async getAntrianPegawai(pegawai) {
    if (pegawai.jenis !== 'PENUH_WAKTU') {
      return [];
    }
    return tteRepository.findAntrianPegawai(pegawai.id);
  },

  async getPreviewDokumenPegawai(pegawai, usulanId) {
    const usulan = await tteRepository.findUsulanById(usulanId);
    if (!usulan || usulan.dataP3kId !== pegawai.id) {
      const err = new Error('Dokumen usulan tidak ditemukan');
      err.status = 404;
      throw err;
    }
    return {
      id: usulan.id,
      nomorKontrak: usulan.nomorKontrak,
      statusTte: usulan.statusTte,
      pdfDraftUrl: usulan.pdfDraftUrl || usulan.generatedFileUrl,
      pdfSignedUrl: usulan.pdfSignedUrl,
      logTandaTangan: usulan.logTandaTangan
    };
  },

  async cekStatusSertifikat(nik) {
    return bsreClient.cekStatusUser(nik);
  },

  async signPegawai(pegawai, userId, usulanId, passphrase, ipAddress) {
    const usulan = await tteRepository.findUsulanById(usulanId);
    if (!usulan || usulan.dataP3kId !== pegawai.id) {
      const err = new Error('Dokumen perpanjangan tidak ditemukan');
      err.status = 404;
      throw err;
    }

    if (usulan.statusTte !== STATUS_TTE.MENUNGGU_TTE_PEGAWAI) {
      const err = new Error(`Dokumen tidak dalam status menunggu TTE Pegawai (Status: ${usulan.statusTte})`);
      err.status = 400;
      throw err;
    }

    const signerNik = pegawai.nik || usulan.dataP3k.nik;
    if (!signerNik) {
      const err = new Error('NIK pegawai tidak ditemukan pada master data. Harap lengkapi NIK terlebih dahulu');
      err.status = 400;
      throw err;
    }

    // Panggil BSrE Client
    const signResult = await bsreClient.signPdf({
      nik: signerNik,
      passphrase,
      draftPdfUrl: usulan.pdfSignedUrl || usulan.pdfDraftUrl || usulan.generatedFileUrl,
      jenis: JENIS_TTE.TTE,
      tampilan: 'VISIBLE'
    });

    const result = await tteRepository.applyTteTransaction({
      usulan,
      tahap: TAHAP_TTE.TTE_PEGAWAI,
      jenis: JENIS_TTE.TTE,
      signerNik,
      userId,
      statusBerikutnya: STATUS_TTE.MENUNGGU_TTE_BUPATI,
      signedFileUrl: signResult.signedFileUrl,
      idDokumenBsre: signResult.idDokumenBsre,
      ipAddress
    });

    activityLogService.logActivity(
      userId,
      'TTE_PEGAWAI',
      'UsulanPerpanjangan',
      usulan.id,
      { nomorKontrak: usulan.nomorKontrak, tahap: TAHAP_TTE.TTE_PEGAWAI }
    );

    return result;
  },

  async getAntrianPejabat(userId, query) {
    const pejabat = await tteRepository.findPejabatByUserId(userId);
    if (!pejabat) {
      const err = new Error('Pengguna tidak terdaftar sebagai pejabat penandatangan aktif');
      err.status = 403;
      throw err;
    }

    let statusTte;
    if (pejabat.jabatan === JABATAN_PEJABAT.KEPALA_BKPSDM) {
      statusTte = STATUS_TTE.MENUNGGU_PARAF_KABAN;
    } else if (pejabat.jabatan === JABATAN_PEJABAT.SEKDA) {
      statusTte = STATUS_TTE.MENUNGGU_PARAF_SEKDA;
    } else if (pejabat.jabatan === JABATAN_PEJABAT.BUPATI) {
      statusTte = STATUS_TTE.MENUNGGU_TTE_BUPATI;
    } else {
      const err = new Error('Jabatan penandatangan tidak valid');
      err.status = 400;
      throw err;
    }

    const result = await tteRepository.findAntrianPejabat(statusTte, query);
    return {
      pejabat: {
        jabatan: pejabat.jabatan,
        nama: pejabat.nama,
        jenis: pejabat.jenis,
        statusTteMenunggu: statusTte
      },
      ...result
    };
  },

  async signPejabat(userId, usulanId, passphrase, ipAddress) {
    const pejabat = await tteRepository.findPejabatByUserId(userId);
    if (!pejabat) {
      const err = new Error('Pengguna tidak terdaftar sebagai pejabat penandatangan aktif');
      err.status = 403;
      throw err;
    }

    const usulan = await tteRepository.findUsulanById(usulanId);
    if (!usulan) {
      const err = new Error('Dokumen perpanjangan tidak ditemukan');
      err.status = 404;
      throw err;
    }

    let tahap;
    let statusBerikutnya;

    if (pejabat.jabatan === JABATAN_PEJABAT.KEPALA_BKPSDM) {
      if (usulan.statusTte !== STATUS_TTE.MENUNGGU_PARAF_KABAN) {
        throw new Error('Dokumen belum berada pada tahap Paraf Kepala BKPSDM');
      }
      tahap = TAHAP_TTE.PARAF_KABAN;
      statusBerikutnya = STATUS_TTE.MENUNGGU_PARAF_SEKDA;
    } else if (pejabat.jabatan === JABATAN_PEJABAT.SEKDA) {
      if (usulan.statusTte !== STATUS_TTE.MENUNGGU_PARAF_SEKDA) {
        throw new Error('Dokumen belum berada pada tahap Paraf Sekda');
      }
      tahap = TAHAP_TTE.PARAF_SEKDA;
      statusBerikutnya = STATUS_TTE.MENUNGGU_TTE_PEGAWAI;
    } else if (pejabat.jabatan === JABATAN_PEJABAT.BUPATI) {
      if (usulan.statusTte !== STATUS_TTE.MENUNGGU_TTE_BUPATI) {
        throw new Error('Dokumen belum berada pada tahap TTE Bupati');
      }
      tahap = TAHAP_TTE.TTE_BUPATI;
      statusBerikutnya = STATUS_TTE.TTE_SELESAI;
    }

    // Panggil BSrE
    const signResult = await bsreClient.signPdf({
      nik: pejabat.nik,
      passphrase,
      draftPdfUrl: usulan.pdfSignedUrl || usulan.pdfDraftUrl,
      jenis: pejabat.jenis,
      tampilan: pejabat.jenis === JENIS_TTE.TTE ? 'VISIBLE' : 'PARAF'
    });

    const result = await tteRepository.applyTteTransaction({
      usulan,
      tahap,
      jenis: pejabat.jenis,
      signerNik: pejabat.nik,
      userId,
      statusBerikutnya,
      signedFileUrl: signResult.signedFileUrl,
      idDokumenBsre: signResult.idDokumenBsre,
      ipAddress
    });

    activityLogService.logActivity(
      userId,
      `TTE_PEJABAT_${pejabat.jabatan}`,
      'UsulanPerpanjangan',
      usulan.id,
      { nomorKontrak: usulan.nomorKontrak, tahap, statusBerikutnya }
    );

    return result;
  },

  async tolakPejabat(userId, usulanId, catatan, ipAddress) {
    const pejabat = await tteRepository.findPejabatByUserId(userId);
    if (!pejabat) {
      const err = new Error('Pengguna tidak terdaftar sebagai pejabat penandatangan');
      err.status = 403;
      throw err;
    }

    const usulan = await tteRepository.findUsulanById(usulanId);
    if (!usulan) {
      const err = new Error('Dokumen tidak ditemukan');
      err.status = 404;
      throw err;
    }

    const result = await tteRepository.applyTolakTte({
      usulan,
      tahap: `PENOLAKAN_${pejabat.jabatan}`,
      jenis: pejabat.jenis,
      signerNik: pejabat.nik,
      userId,
      catatan,
      ipAddress
    });

    activityLogService.logActivity(
      userId,
      `TOLAK_TTE_${pejabat.jabatan}`,
      'UsulanPerpanjangan',
      usulan.id,
      { nomorKontrak: usulan.nomorKontrak, catatan }
    );

    return result;
  },

  // CRUD Pejabat
  async listPejabat() {
    return tteRepository.listPejabat();
  },

  async createPejabat(data) {
    return tteRepository.createPejabat(data);
  },

  async updatePejabat(id, data) {
    return tteRepository.updatePejabat(id, data);
  },

  async deletePejabat(id) {
    return tteRepository.deletePejabat(id);
  }
};
