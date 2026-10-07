import fs from 'fs';
import path from 'path';
import { tteRepository } from './tte.repository.js';
import bsreClient from './bsre.client.js';
import { STATUS_TTE, TAHAP_TTE, JENIS_TTE, JABATAN_PEJABAT } from './bsre.constants.js';
import activityLogService from '../activity-log/activityLog.service.js';
import tteNotifikasiService from './tte-notifikasi.service.js';
import pdfService from './pdf.service.js';
import { PerpanjanganService } from '../perpanjangan/perpanjangan.service.js';

/**
 * Pemetaan jabatan pejabat ke tahap TTE yang menjadi wewenangnya.
 */
const TAHAP_PER_JABATAN = {
  [JABATAN_PEJABAT.KEPALA_BKPSDM]: {
    statusSaatIni: STATUS_TTE.MENUNGGU_PARAF_KABAN,
    statusBerikutnya: STATUS_TTE.MENUNGGU_PARAF_SEKDA,
    tahap: TAHAP_TTE.PARAF_KABAN,
    label: 'Paraf Kepala BKPSDM'
  },
  [JABATAN_PEJABAT.SEKDA]: {
    statusSaatIni: STATUS_TTE.MENUNGGU_PARAF_SEKDA,
    statusBerikutnya: STATUS_TTE.MENUNGGU_TTE_PEGAWAI,
    tahap: TAHAP_TTE.PARAF_SEKDA,
    label: 'Paraf Sekda'
  },
  [JABATAN_PEJABAT.BUPATI]: {
    statusSaatIni: STATUS_TTE.MENUNGGU_TTE_BUPATI,
    statusBerikutnya: STATUS_TTE.TTE_SELESAI,
    tahap: TAHAP_TTE.TTE_BUPATI,
    label: 'TTE Bupati'
  }
};

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const getTahapPejabat = (jabatan) => {
  const tahap = TAHAP_PER_JABATAN[jabatan];
  if (!tahap) {
    throw httpError('Jabatan penandatangan tidak valid', 400);
  }
  return tahap;
};

const getPejabatAktifOrThrow = async (userId) => {
  const pejabat = await tteRepository.findPejabatByUserId(userId);
  if (!pejabat) {
    throw httpError('Pengguna tidak terdaftar sebagai pejabat penandatangan aktif', 403);
  }
  return pejabat;
};

const getUsulanDiTahapPejabatOrThrow = async (usulanId, tahapPejabat) => {
  const usulan = await tteRepository.findUsulanById(usulanId);
  if (!usulan) {
    throw httpError('Dokumen perpanjangan tidak ditemukan', 404);
  }
  if (usulan.statusTte !== tahapPejabat.statusSaatIni) {
    throw httpError(
      `Dokumen belum/tidak berada pada tahap ${tahapPejabat.label} (Status saat ini: ${usulan.statusTte || '-'})`,
      400
    );
  }
  return usulan;
};

const hasRole = (roleString, target) =>
  String(roleString || '')
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .includes(target);

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

    // Notifikasi email ke Bupati (Tahap berikutnya: MENUNGGU_TTE_BUPATI)
    tteNotifikasiService
      .kirimNotifikasiTahapBerikutnya(STATUS_TTE.MENUNGGU_TTE_BUPATI, {
        ...usulan,
        nomorKontrak: usulan.nomorKontrak
      })
      .catch(() => {});

    return result;
  },

  async getAntrianPejabat(userId, query) {
    const pejabat = await getPejabatAktifOrThrow(userId);
    const { statusSaatIni: statusTte } = getTahapPejabat(pejabat.jabatan);

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

  async getRiwayatPejabat(userId, query) {
    const pejabat = await getPejabatAktifOrThrow(userId);
    const result = await tteRepository.findRiwayatPejabat(userId, query);
    return {
      pejabat: {
        jabatan: pejabat.jabatan,
        nama: pejabat.nama,
        jenis: pejabat.jenis
      },
      ...result
    };
  },

  async getStatistikPejabat(userId) {
    const pejabat = await getPejabatAktifOrThrow(userId);
    const { statusSaatIni: statusTte } = getTahapPejabat(pejabat.jabatan);
    const stats = await tteRepository.findStatistikPejabat(userId, statusTte);
    return {
      pejabat: {
        jabatan: pejabat.jabatan,
        nama: pejabat.nama,
        jenis: pejabat.jenis,
        statusTteMenunggu: statusTte
      },
      stats
    };
  },

  async getMonitoringTte(query) {
    return tteRepository.findMonitoringTte(query);
  },

  async getMonitoringTteStats() {
    return tteRepository.getMonitoringTteStats();
  },

  async regeneratePdf(usulanId) {
    const usulan = await tteRepository.findUsulanById(usulanId);
    if (!usulan || usulan.isDeleted) {
      throw httpError('Dokumen perpanjangan kontrak tidak ditemukan', 404);
    }

    let generatedFileUrl = usulan.generatedFileUrl;

    // Cek apakah file DOCX fisik ada di server
    let docxPath = null;
    if (generatedFileUrl) {
      const cleanRel = generatedFileUrl.startsWith('/') ? generatedFileUrl.slice(1) : generatedFileUrl;
      const fullPath = path.join(process.cwd(), cleanRel);
      if (fs.existsSync(fullPath)) {
        docxPath = cleanRel;
      }
    }

    // Jika DOCX belum ada atau file fisik hilang, generate ulang file Word dari template
    if (!docxPath) {
      if (!usulan.templateKontrak || !usulan.templateKontrak.fileUrl) {
        throw httpError('Template kontrak tidak terpasang pada usulan ini sehingga dokumen tidak dapat digenerate ulang', 400);
      }
      generatedFileUrl = await PerpanjanganService._generateDocument(usulan);
      docxPath = generatedFileUrl.startsWith('/') ? generatedFileUrl.slice(1) : generatedFileUrl;
    }

    // Konversi DOCX ke PDF via LibreOffice headless (atau fallback valid PDF jika libreoffice belum ada)
    const outPdfDir = path.join(process.cwd(), 'uploads', 'pdf-draft');
    const generatedPdfPath = await pdfService.convertDocxToPdf(docxPath, outPdfDir);
    const pdfDraftUrl = `/uploads/pdf-draft/${path.basename(generatedPdfPath)}`;

    // Update usulan di database
    const updated = await tteRepository.updateUsulan(usulanId, {
      generatedFileUrl,
      pdfDraftUrl
    });

    return {
      id: updated.id,
      nomorKontrak: updated.nomorKontrak,
      generatedFileUrl: updated.generatedFileUrl,
      pdfDraftUrl: updated.pdfDraftUrl,
      statusTte: updated.statusTte
    };
  },

  async signPejabat(userId, usulanId, passphrase, ipAddress) {
    const pejabat = await getPejabatAktifOrThrow(userId);
    const tahapPejabat = getTahapPejabat(pejabat.jabatan);
    const usulan = await getUsulanDiTahapPejabatOrThrow(usulanId, tahapPejabat);
    const { tahap, statusBerikutnya } = tahapPejabat;

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

    // Notifikasi email ke pejabat tahap berikutnya (misal: Kaban selesai Paraf -> notifikasi ke Sekda)
    tteNotifikasiService
      .kirimNotifikasiTahapBerikutnya(statusBerikutnya, {
        ...usulan,
        nomorKontrak: usulan.nomorKontrak
      })
      .catch(() => {});

    return result;
  },

  async tolakPejabat(userId, usulanId, catatan, ipAddress) {
    const pejabat = await getPejabatAktifOrThrow(userId);
    const tahapPejabat = getTahapPejabat(pejabat.jabatan);
    // Pejabat hanya boleh menolak dokumen yang sedang berada di tahap wewenangnya
    const usulan = await getUsulanDiTahapPejabatOrThrow(usulanId, tahapPejabat);

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

  async _validatePejabatData(data, excludeId = null) {
    if (data.userId) {
      const user = await tteRepository.findUserRoleById(data.userId);
      if (!user) {
        throw httpError('Akun pengguna tidak ditemukan atau sudah dinonaktifkan', 404);
      }
      if (!hasRole(user.role, 'pejabat_ttd')) {
        throw httpError(
          'Akun pengguna belum memiliki role "pejabat_ttd". Tambahkan role tersebut di Manajemen User terlebih dahulu',
          400
        );
      }
    }

    if (data.jabatan && data.isActive !== false) {
      const bentrok = await tteRepository.findActivePejabatByJabatan(data.jabatan, excludeId);
      if (bentrok) {
        throw httpError(
          `Jabatan ${data.jabatan} sudah diisi oleh pejabat aktif (${bentrok.nama}). Nonaktifkan pejabat tersebut terlebih dahulu`,
          409
        );
      }
    }
  },

  async createPejabat(data) {
    await this._validatePejabatData(data);

    const existing = await tteRepository.findPejabatRecordByUserId(data.userId);
    if (existing && !existing.isDeleted) {
      throw httpError('Akun pengguna ini sudah terdaftar sebagai pejabat penandatangan', 409);
    }
    if (existing && existing.isDeleted) {
      // userId bersifat unik: pulihkan record lama yang sudah di-soft-delete
      return tteRepository.updatePejabat(existing.id, { ...data, isDeleted: false });
    }

    return tteRepository.createPejabat(data);
  },

  async updatePejabat(id, data) {
    const current = await tteRepository.findPejabatById(id);
    if (!current) {
      throw httpError('Pejabat penandatangan tidak ditemukan', 404);
    }

    const userIdBerubah = Boolean(data.userId && data.userId !== current.userId);

    if (userIdBerubah) {
      const existing = await tteRepository.findPejabatRecordByUserId(data.userId);
      if (existing) {
        throw httpError('Akun pengguna ini sudah tertaut ke data pejabat lain', 409);
      }
    }

    await this._validatePejabatData(
      {
        userId: userIdBerubah ? data.userId : null,
        jabatan: data.jabatan || current.jabatan,
        isActive: data.isActive !== undefined ? data.isActive : current.isActive
      },
      id
    );

    return tteRepository.updatePejabat(id, data);
  },

  async deletePejabat(id) {
    const current = await tteRepository.findPejabatById(id);
    if (!current) {
      throw httpError('Pejabat penandatangan tidak ditemukan', 404);
    }
    return tteRepository.deletePejabat(id);
  }
};
