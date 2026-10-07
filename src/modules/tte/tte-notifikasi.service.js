import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import logger from '../../config/logger.js';
import { tteRepository } from './tte.repository.js';
import { JABATAN_PEJABAT, STATUS_TTE } from './bsre.constants.js';

dotenv.config();

const port = parseInt(process.env.SMTP_PORT || '587');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? String(process.env.SMTP_PASS).replace(/\s+/g, '') : '',
  },
});

/**
 * Service pengiriman notifikasi email ke pejabat penandatangan / staf terkait alur TTE
 */
export const tteNotifikasiService = {
  /**
   * Kirim notifikasi email ke pejabat berwenang saat dokumen masuk ke antriannya
   * @param {string} targetJabatan - KEPALA_BKPSDM | SEKDA | BUPATI
   * @param {object} usulan - Data usulan perpanjangan kontrak
   * @param {string} jenisAksi - 'PARAF' | 'TTE'
   */
  async notifikasiAntrianPejabat(targetJabatan, usulan, jenisAksi = 'PARAF') {
    // Nonaktifkan sementara sesuai instruksi (belum diterapkan saat ini)
    const isEnabled = process.env.ENABLE_EMAIL_NOTIFIKASI_PEJABAT === 'true';
    if (!isEnabled) {
      return { success: false, reason: 'disabled' };
    }

    try {
      const pejabat = await tteRepository.findActivePejabatByJabatan(targetJabatan);
      if (!pejabat || !pejabat.user || !pejabat.user.email) {
        logger.warn(`Notifikasi TTE dilewati: Pejabat aktif untuk jabatan ${targetJabatan} atau email tidak ditemukan.`);
        return { success: false, reason: 'pejabat_not_found' };
      }

      const toEmail = pejabat.user.email;
      const namaPejabat = pejabat.nama || pejabat.user.namaLengkap || targetJabatan;
      const nomorKontrak = usulan.nomorKontrak || 'Draft Kontrak Baru';
      const namaPegawai = usulan.dataP3k?.nama || 'Pegawai P3K';

      const mailOptions = {
        from: process.env.SMTP_FROM || '"SIPPPK BKPSDM" <noreply@sipppk.tojouanuna.go.id>',
        to: toEmail,
        subject: `[SIPPPK] Menunggu ${jenisAksi} Dokumen Kontrak Kerja: ${nomorKontrak}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-bottom: 4px;">Permohonan ${jenisAksi === 'TTE' ? 'Tanda Tangan Elektronik' : 'Paraf Elektronik'}</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">Sistem Informasi Manajemen Pegawai P3K BKPSDM</p>
            </div>
            <p style="color: #334155; line-height: 1.6;">Yth. Bapak/Ibu <strong>${namaPejabat}</strong>,</p>
            <p style="color: #334155; line-height: 1.6;">
              Terdapat dokumen kontrak kerja PPPK yang memerlukan <strong>${jenisAksi === 'TTE' ? 'Tanda Tangan Elektronik (TTE Final)' : 'Paraf Elektronik'}</strong> Anda pada aplikasi SIPPPK:
            </p>
            <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 4px 0; color: #475569; font-size: 14px;"><strong>Nomor Kontrak:</strong> ${nomorKontrak}</p>
              <p style="margin: 4px 0; color: #475569; font-size: 14px;"><strong>Nama Pegawai:</strong> ${namaPegawai}</p>
              <p style="margin: 4px 0; color: #475569; font-size: 14px;"><strong>Status Alur:</strong> Menunggu ${jenisAksi} ${targetJabatan}</p>
            </div>
            <p style="color: #334155; line-height: 1.6;">
              Silakan login ke aplikasi SIPPPK pada menu <strong>TTE Kontrak</strong> untuk memeriksa dokumen dan membubuhkan ${jenisAksi} menggunakan passphrase sertifikat BSrE Anda.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">BKPSDM Kabupaten Tojo Una-Una — SIPPPK</p>
          </div>
        `
      };

      if (process.env.NODE_ENV === 'test' || !process.env.SMTP_USER) {
        logger.info(`[NOTIFIKASI TTE TEST] Email ${jenisAksi} dikirim ke ${toEmail} (${targetJabatan}) untuk kontrak ${nomorKontrak}`);
        return { success: true, simulated: true };
      }

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Notifikasi email TTE terkirim ke ${toEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(`Gagal mengirimkan notifikasi email TTE ke ${targetJabatan}: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  /**
   * Helper untuk menentukan target pejabat berikutnya dan mengirim notifikasi
   */
  async kirimNotifikasiTahapBerikutnya(statusBerikutnya, usulan) {
    if (statusBerikutnya === STATUS_TTE.MENUNGGU_PARAF_KABAN) {
      return this.notifikasiAntrianPejabat(JABATAN_PEJABAT.KEPALA_BKPSDM, usulan, 'PARAF');
    }
    if (statusBerikutnya === STATUS_TTE.MENUNGGU_PARAF_SEKDA) {
      return this.notifikasiAntrianPejabat(JABATAN_PEJABAT.SEKDA, usulan, 'PARAF');
    }
    if (statusBerikutnya === STATUS_TTE.MENUNGGU_TTE_BUPATI) {
      return this.notifikasiAntrianPejabat(JABATAN_PEJABAT.BUPATI, usulan, 'TTE');
    }
    return null;
  }
};

export default tteNotifikasiService;
