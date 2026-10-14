import { asyncHandler } from '../../middlewares/error.middleware.js';
import prisma from '../../config/database.js';

export const getVerifikasiDokumen = asyncHandler(async (req, res) => {
  const { usulanId } = req.params;

  if (!usulanId) {
    return res.status(400).json({
      success: false,
      message: 'ID Dokumen usulan tidak valid'
    });
  }

  const usulan = await prisma.usulanPerpanjangan.findFirst({
    where: {
      id: usulanId,
      isDeleted: false
    },
    include: {
      dataP3k: {
        select: {
          id: true,
          nama: true,
          nipBaru: true,
          nik: true,
          jabatanNama: true,
          unorNama: true,
          golAkhirNama: true,
          golAwalNama: true
        }
      },
      logTandaTangan: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              namaLengkap: true,
              role: true
            }
          }
        }
      }
    }
  });

  if (!usulan) {
    return res.status(404).json({
      success: false,
      message: 'Dokumen verifikasi tidak ditemukan dalam sistem SIPPPK'
    });
  }

  const logs = usulan.logTandaTangan || [];
  const statusTte = usulan.statusTte || '';

  const kabanLog = logs.find((l) => l.tahap === 'PARAF_KABAN' && l.status === 'SUKSES');
  const sekdaLog = logs.find((l) => l.tahap === 'PARAF_SEKDA' && l.status === 'SUKSES');
  const pegawaiLog = logs.find((l) => l.tahap === 'TTE_PEGAWAI' && l.status === 'SUKSES');
  const bupatiLog = logs.find((l) => l.tahap === 'TTE_BUPATI' && l.status === 'SUKSES');

  const isKabanParaf = Boolean(
    kabanLog ||
    ['MENUNGGU_PARAF_SEKDA', 'MENUNGGU_TTE_PEGAWAI', 'MENUNGGU_TTE_BUPATI', 'TTE_SELESAI'].includes(statusTte)
  );

  const isSekdaParaf = Boolean(
    sekdaLog ||
    ['MENUNGGU_TTE_PEGAWAI', 'MENUNGGU_TTE_BUPATI', 'TTE_SELESAI'].includes(statusTte)
  );

  const isPegawaiSigned = Boolean(
    pegawaiLog ||
    ['MENUNGGU_TTE_BUPATI', 'TTE_SELESAI'].includes(statusTte)
  );

  const isBupatiSigned = Boolean(
    bupatiLog ||
    statusTte === 'TTE_SELESAI'
  );

  const isSelesai = statusTte === 'TTE_SELESAI';

  // Sensor NIK untuk keamanan privasi publik
  const maskNik = (nik) => {
    if (!nik || nik.length < 8) return '****';
    return nik.substring(0, 4) + '********' + nik.substring(nik.length - 4);
  };

  const responseData = {
    usulan: {
      id: usulan.id,
      nomorKontrak: usulan.nomorKontrak || 'DRAFT',
      statusTte: usulan.statusTte,
      status: usulan.status,
      tanggalMulai: usulan.tanggalMulai,
      tanggalSelesai: usulan.tanggalSelesai,
      tanggalTtd: usulan.tanggalTtd,
      isSelesai,
      pdfUrl: usulan.pdfSignedUrl || usulan.pdfDraftUrl || usulan.generatedFileUrl
    },
    pegawai: {
      nama: usulan.dataP3k?.nama || '-',
      nipBaru: usulan.dataP3k?.nipBaru || '-',
      nikMasked: maskNik(usulan.dataP3k?.nik),
      jabatanNama: usulan.dataP3k?.jabatanNama || '-',
      unorNama: usulan.dataP3k?.unorNama || '-',
      golongan: usulan.dataP3k?.golAkhirNama || usulan.dataP3k?.golAwalNama || '-'
    },
    tteUtama: {
      bupati: {
        label: 'Pihak Kesatu (Bupati Tojo Una-Una)',
        nama: bupatiLog?.user?.namaLengkap || 'Bupati Tojo Una-Una',
        isSigned: isBupatiSigned,
        waktu: bupatiLog?.createdAt || (isBupatiSigned ? usulan.updatedAt : null),
        idDokumenBsre: bupatiLog?.idDokumenBsre || null
      },
      pegawai: {
        label: 'Pihak Kedua (Pegawai PPPK)',
        nama: usulan.dataP3k?.nama || 'Pegawai PPPK',
        nip: usulan.dataP3k?.nipBaru || '-',
        isSigned: isPegawaiSigned,
        waktu: pegawaiLog?.createdAt || (isPegawaiSigned ? usulan.updatedAt : null),
        idDokumenBsre: pegawaiLog?.idDokumenBsre || null
      }
    },
    parafKoordinasi: [
      {
        urutan: 1,
        jabatan: 'Kepala BKPSDM',
        nama: kabanLog?.user?.namaLengkap || 'Kepala BKPSDM',
        isParaf: isKabanParaf,
        waktu: kabanLog?.createdAt || null
      },
      {
        urutan: 2,
        jabatan: 'Sekretaris Daerah',
        nama: sekdaLog?.user?.namaLengkap || 'Sekretaris Daerah',
        isParaf: isSekdaParaf,
        waktu: sekdaLog?.createdAt || null
      }
    ],
    linimasa: logs.map((l) => ({
      id: l.id,
      tahap: l.tahap,
      jenis: l.jenis,
      status: l.status,
      namaPelaku: l.user?.namaLengkap || l.tahap,
      waktu: l.createdAt,
      pesan: l.pesan,
      idDokumenBsre: l.idDokumenBsre
    })),
    pembatalanTerakhir: logs.slice().reverse().find((l) => l.tahap === 'PEMBATALAN_KONTRAK') ? {
      alasan: logs.slice().reverse().find((l) => l.tahap === 'PEMBATALAN_KONTRAK')?.pesan,
      waktu: logs.slice().reverse().find((l) => l.tahap === 'PEMBATALAN_KONTRAK')?.createdAt,
      namaPelaku: logs.slice().reverse().find((l) => l.tahap === 'PEMBATALAN_KONTRAK')?.user?.namaLengkap || 'Administrator'
    } : null
  };

  res.status(200).json({
    success: true,
    data: responseData,
    message: 'Data verifikasi dokumen berhasil diambil'
  });
});
