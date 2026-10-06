import prisma from '../../config/database.js';

class PortalAuthRepository {
  /**
   * Cari data pegawai aktif berdasarkan NIP (Penuh Waktu atau Paruh Waktu)
   */
  async findActivePegawaiByNip(nipBaru) {
    const cleanNip = String(nipBaru).replace(/['"`\s]/g, '').trim();

    // 1. Cek DataP3k (Penuh Waktu)
    const penuhWaktu = await prisma.dataP3k.findFirst({
      where: {
        nipBaru: cleanNip,
        isDeleted: false,
        statusPensiun: 'AKTIF'
      },
      select: {
        id: true,
        nipBaru: true,
        nik: true,
        tanggalLahir: true,
        nama: true,
        gelarDepan: true,
        gelarBelakang: true,
        email: true,
        nomorHp: true,
        alamat: true,
        akunPegawai: {
          select: { id: true, isDeleted: true }
        }
      }
    });

    if (penuhWaktu) {
      return {
        jenisPegawai: 'PENUH_WAKTU',
        pegawai: penuhWaktu
      };
    }

    // 2. Cek DataP3kParuhWaktu (Paruh Waktu)
    const paruhWaktu = await prisma.dataP3kParuhWaktu.findFirst({
      where: {
        nipBaru: cleanNip,
        isDeleted: false,
        statusPensiun: 'AKTIF'
      },
      select: {
        id: true,
        nipBaru: true,
        nik: true,
        tanggalLahir: true,
        nama: true,
        gelarDepan: true,
        gelarBelakang: true,
        email: true,
        nomorHp: true,
        alamat: true,
        akunPegawai: {
          select: { id: true, isDeleted: true }
        }
      }
    });

    if (paruhWaktu) {
      return {
        jenisPegawai: 'PARUH_WAKTU',
        pegawai: paruhWaktu
      };
    }

    return null;
  }

  /**
   * Cek apakah user dengan username/NIP sudah terdaftar
   */
  async findUserByUsername(username) {
    return prisma.user.findFirst({
      where: {
        username: String(username).trim(),
        isDeleted: false
      },
      select: { id: true, username: true, email: true, role: true, dataP3kId: true, dataP3kParuhWaktuId: true }
    });
  }

  /**
   * Cek apakah sudah ada akun aktif yang terhubung dengan NIP atau data pegawai ini
   */
  async findActiveUserByPegawai({ nipBaru, dataP3kId, dataP3kParuhWaktuId }) {
    const cleanNip = String(nipBaru).trim();
    return prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanNip },
          ...(dataP3kId ? [{ dataP3kId }] : []),
          ...(dataP3kParuhWaktuId ? [{ dataP3kParuhWaktuId }] : [])
        ],
        isDeleted: false
      },
      select: { id: true, username: true, email: true, role: true }
    });
  }

  /**
   * Cek apakah user dengan alamat email sudah terdaftar
   */
  async findUserByEmail(email) {
    return prisma.user.findFirst({
      where: {
        email: String(email).trim().toLowerCase(),
        isDeleted: false
      },
      select: { id: true, username: true, email: true, role: true, dataP3kId: true, dataP3kParuhWaktuId: true }
    });
  }

  /**
   * Simpan token OTP aktivasi baru
   */
  async createOtpToken(data) {
    // Nonaktifkan token lama untuk NIP yang sama
    await prisma.aktivasiPegawaiToken.updateMany({
      where: {
        nipBaru: data.nipBaru,
        usedAt: null
      },
      data: {
        usedAt: new Date()
      }
    });

    return prisma.aktivasiPegawaiToken.create({
      data: {
        nipBaru: data.nipBaru,
        jenisPegawai: data.jenisPegawai,
        dataPegawaiId: data.dataPegawaiId,
        email: data.email,
        otpHash: data.otpHash,
        attempts: 0,
        expiresAt: data.expiresAt
      }
    });
  }

  /**
   * Ambil token OTP aktif terakhir untuk NIP tertentu
   */
  async findLatestActiveOtpToken(nipBaru) {
    return prisma.aktivasiPegawaiToken.findFirst({
      where: {
        nipBaru: String(nipBaru).trim(),
        usedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Tambah percobaan salah pada token
   */
  async incrementAttempts(tokenId) {
    return prisma.aktivasiPegawaiToken.update({
      where: { id: tokenId },
      data: { attempts: { increment: 1 } }
    });
  }

  /**
   * Tandai token telah digunakan
   */
  async markTokenUsed(tokenId, tx = prisma) {
    return tx.aktivasiPegawaiToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() }
    });
  }

  /**
   * Buat user akun pegawai dan simpan activity log dalam transaksi atomik
   */
  async createPegawaiAccount(userData, tokenId) {
    return prisma.$transaction(async (tx) => {
      // 1. Cek apakah ada record user lama (misal akun pernah di-soft delete)
      const existingDeletedUser = await tx.user.findFirst({
        where: {
          OR: [
            ...(userData.dataP3kId ? [{ dataP3kId: userData.dataP3kId }] : []),
            ...(userData.dataP3kParuhWaktuId ? [{ dataP3kParuhWaktuId: userData.dataP3kParuhWaktuId }] : []),
            { username: { startsWith: `${userData.username}_del_` } }
          ],
          isDeleted: true
        }
      });

      let user;
      if (existingDeletedUser) {
        // Reaktivasi user lama yang pernah dihapus dengan kredensial & role baru
        user = await tx.user.update({
          where: { id: existingDeletedUser.id },
          data: {
            ...userData,
            isDeleted: false
          },
          select: {
            id: true,
            username: true,
            email: true,
            namaLengkap: true,
            role: true,
            jenisPegawaiPortal: true,
            dataP3kId: true,
            dataP3kParuhWaktuId: true,
            createdAt: true
          }
        });
      } else {
        user = await tx.user.create({
          data: userData,
          select: {
            id: true,
            username: true,
            email: true,
            namaLengkap: true,
            role: true,
            jenisPegawaiPortal: true,
            dataP3kId: true,
            dataP3kParuhWaktuId: true,
            createdAt: true
          }
        });
      }

      // 2. Tandai token OTP telah digunakan
      await tx.aktivasiPegawaiToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() }
      });

      // 3. Catat log aktivitas
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'AKTIVASI_AKUN_PEGAWAI',
          entityType: 'User',
          entityId: user.id,
          details: `Aktivasi akun mandiri untuk NIP ${user.username} (${user.jenisPegawaiPortal})`
        }
      });

      return user;
    });
  }
}

export default new PortalAuthRepository();
