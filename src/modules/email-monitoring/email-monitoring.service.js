import emailMonitoringRepository from './email-monitoring.repository.js';
import { verifySmtpConnection } from '../../utils/email.service.js';

class EmailMonitoringService {
  /**
   * Mengambil ringkasan penggunaan kuota email harian dan 24 jam terakhir
   */
  async getQuotaSummary() {
    const now = new Date();
    
    // 1. Batas 24 jam terakhir (rolling 24-hour window yang diterapkan oleh Gmail)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 2. Batas awal hari ini (00:00:00)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Query data penghitungan paralel
    const [
      otp24h,
      reset24h,
      otpToday,
      resetToday,
      recentOtp,
      recentReset
    ] = await Promise.all([
      emailMonitoringRepository.countAktivasiOtp(twentyFourHoursAgo),
      emailMonitoringRepository.countPasswordReset(twentyFourHoursAgo),
      emailMonitoringRepository.countAktivasiOtp(startOfToday),
      emailMonitoringRepository.countPasswordReset(startOfToday),
      emailMonitoringRepository.getRecentAktivasiOtp(10),
      emailMonitoringRepository.getRecentPasswordReset(10)
    ]);

    const totalSent24h = otp24h + reset24h;
    const totalSentToday = otpToday + resetToday;

    // Batas kuota harian (Default 500 untuk akun @gmail.com)
    const smtpUser = process.env.SMTP_USER || '';
    const isGoogleWorkspace = smtpUser && !smtpUser.endsWith('@gmail.com');
    const defaultLimit = isGoogleWorkspace ? 2000 : 500;
    const dailyQuotaLimit = parseInt(process.env.SMTP_DAILY_LIMIT || String(defaultLimit), 10);

    const remainingQuota = Math.max(0, dailyQuotaLimit - totalSent24h);
    const percentUsed = Math.min(100, parseFloat(((totalSent24h / dailyQuotaLimit) * 100).toFixed(1)));

    let status = 'AMAN';
    if (totalSent24h >= dailyQuotaLimit) {
      status = 'HABIS';
    } else if (percentUsed >= 80) {
      status = 'PERINGATAN';
    }

    // Gabungkan riwayat terbaru
    const recentEmails = [
      ...recentOtp.map(item => ({
        id: item.id,
        tipe: 'AKTIVASI_OTP',
        deskripsi: `Aktivasi Akun Pegawai (${item.jenisPegawai}) - NIP ${item.nipBaru}`,
        emailTujuan: item.email,
        waktuKirim: item.createdAt,
        statusAktivasi: item.usedAt ? 'SUDAH_DIGUNAKAN' : 'BELUM_DIGUNAKAN'
      })),
      ...recentReset.map(item => ({
        id: item.id,
        tipe: 'RESET_PASSWORD',
        deskripsi: 'Permintaan Reset Kata Sandi User',
        emailTujuan: item.email,
        waktuKirim: item.createdAt,
        statusAktivasi: new Date() > new Date(item.expiresAt) ? 'KADALUARSA' : 'AKTIF'
      }))
    ].sort((a, b) => new Date(b.waktuKirim).getTime() - new Date(a.waktuKirim).getTime()).slice(0, 15);

    return {
      provider: 'Google Gmail SMTP',
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
      smtpUser: smtpUser || '(Belum dikonfigurasi)',
      dailyQuotaLimit,
      usage24h: {
        totalSent: totalSent24h,
        otpAktivasi: otp24h,
        resetPassword: reset24h,
        remainingQuota,
        percentUsed,
        status
      },
      usageToday: {
        tanggal: now.toISOString().split('T')[0],
        totalSent: totalSentToday,
        otpAktivasi: otpToday,
        resetPassword: resetToday
      },
      recentEmails
    };
  }

  /**
   * Menjalankan pengujian koneksi ke SMTP server secara on-demand
   */
  async testSmtpConnection() {
    return await verifySmtpConnection();
  }
}

export default new EmailMonitoringService();

