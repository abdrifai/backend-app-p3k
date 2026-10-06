import prisma from '../config/database.js';

/**
 * Middleware untuk memvalidasi dan memuat data pegawai yang sedang login ke req.pegawai
 * Dipanggil setelah middleware `authenticate` dan `authorize('pegawai')`
 */
export const loadPegawai = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Pengguna belum terotentikasi'
      });
    }

    // Ambil fresh data user dari DB untuk memastikan status tautan dan aktif
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        dataP3kId: true,
        dataP3kParuhWaktuId: true,
        jenisPegawaiPortal: true,
        isDeleted: true
      }
    });

    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Akun pengguna tidak ditemukan atau sudah dinonaktifkan'
      });
    }

    if (!user.dataP3kId && !user.dataP3kParuhWaktuId) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda belum ditautkan dengan data pegawai PPPK yang valid'
      });
    }

    let pegawaiData = null;
    let jenisPegawai = user.jenisPegawaiPortal;

    if (user.dataP3kId) {
      pegawaiData = await prisma.dataP3k.findFirst({
        where: {
          id: user.dataP3kId,
          isDeleted: false,
          statusPensiun: 'AKTIF'
        }
      });
      jenisPegawai = 'PENUH_WAKTU';
    } else if (user.dataP3kParuhWaktuId) {
      pegawaiData = await prisma.dataP3kParuhWaktu.findFirst({
        where: {
          id: user.dataP3kParuhWaktuId,
          isDeleted: false,
          statusPensiun: 'AKTIF'
        }
      });
      jenisPegawai = 'PARUH_WAKTU';
    }

    if (!pegawaiData) {
      return res.status(403).json({
        success: false,
        message: 'Data kepegawaian Anda tidak ditemukan atau berstatus tidak aktif / telah pensiun'
      });
    }

    // Pasang context pegawai ke request
    req.pegawai = {
      id: pegawaiData.id,
      nipBaru: pegawaiData.nipBaru,
      nik: pegawaiData.nik,
      nama: pegawaiData.nama,
      jenis: jenisPegawai,
      jenisPegawai,
      dataP3kId: user.dataP3kId || null,
      dataP3kParuhWaktuId: user.dataP3kParuhWaktuId || null,
      raw: pegawaiData
    };

    next();
  } catch (err) {
    next(err);
  }
};
