import prisma from '../../config/database.js';

class EmailMonitoringRepository {
  /**
   * Menghitung total OTP aktivasi yang dibuat sejak waktu tertentu
   * @param {Date} sinceDate 
   * @returns {Promise<number>}
   */
  async countAktivasiOtp(sinceDate) {
    return await prisma.aktivasiPegawaiToken.count({
      where: {
        createdAt: {
          gte: sinceDate,
        },
      },
    });
  }

  /**
   * Menghitung total token reset password yang dibuat sejak waktu tertentu
   * @param {Date} sinceDate 
   * @returns {Promise<number>}
   */
  async countPasswordReset(sinceDate) {
    return await prisma.passwordResetToken.count({
      where: {
        createdAt: {
          gte: sinceDate,
        },
      },
    });
  }

  /**
   * Mengambil riwayat pengiriman OTP aktivasi terbaru
   * @param {number} limit 
   */
  async getRecentAktivasiOtp(limit = 10) {
    return await prisma.aktivasiPegawaiToken.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        nipBaru: true,
        email: true,
        jenisPegawai: true,
        createdAt: true,
        usedAt: true,
      },
    });
  }

  /**
   * Mengambil riwayat pengiriman reset password terbaru
   * @param {number} limit 
   */
  async getRecentPasswordReset(limit = 10) {
    return await prisma.passwordResetToken.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }
}

export default new EmailMonitoringRepository();

