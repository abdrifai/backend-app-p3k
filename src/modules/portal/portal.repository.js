import prisma from '../../config/database.js';

class PortalRepository {
  /**
   * Ambil data lengkap pegawai (Penuh Waktu)
   */
  async getPenuhWaktuById(id) {
    return prisma.dataP3k.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        nipBaru: true,
        nipLama: true,
        pnsId: true,
        nama: true,
        gelarDepan: true,
        gelarBelakang: true,
        tempatLahirNama: true,
        tanggalLahir: true,
        jenisKelamin: true,
        agamaNama: true,
        jenisKawinNama: true,
        nik: true,
        nomorHp: true,
        email: true,
        emailGov: true,
        alamat: true,
        npwpNomor: true,
        bpjs: true,
        jenisPegawaiNama: true,
        kedudukanHukumNama: true,
        statusCpnsPns: true,
        kartuAsnVirtual: true,
        nomorSkCpns: true,
        tanggalSkCpns: true,
        tmtCpns: true,
        golAwalNama: true,
        golAkhirNama: true,
        tmtGolongan: true,
        mkTahun: true,
        mkBulan: true,
        jenisJabatanNama: true,
        jabatanNama: true,
        tmtJabatan: true,
        tingkatPendidikanNama: true,
        pendidikanNama: true,
        tahunLulus: true,
        namaSekolah: true,
        lokasiKerjaNama: true,
        unorNama: true,
        instansiIndukNama: true,
        satuanKerjaKerjaNama: true,
        statusPensiun: true,
        arsipSkCpns: {
          select: { id: true, nomorSk: true, tanggalSk: true, fileUrl: true }
        },
        unorInduk: {
          select: { id: true, nama: true }
        }
      }
    });
  }

  /**
   * Ambil data lengkap pegawai (Paruh Waktu)
   */
  async getParuhWaktuById(id) {
    return prisma.dataP3kParuhWaktu.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        nipBaru: true,
        nipLama: true,
        pnsId: true,
        nama: true,
        gelarDepan: true,
        gelarBelakang: true,
        tempatLahirNama: true,
        tanggalLahir: true,
        jenisKelamin: true,
        agamaNama: true,
        jenisKawinNama: true,
        nik: true,
        nomorHp: true,
        email: true,
        emailGov: true,
        alamat: true,
        npwpNomor: true,
        bpjs: true,
        jenisPegawaiNama: true,
        kedudukanHukumNama: true,
        statusCpnsPns: true,
        kartuAsnVirtual: true,
        nomorSkCpns: true,
        tanggalSkCpns: true,
        tmtCpns: true,
        golAwalNama: true,
        golAkhirNama: true,
        tmtGolongan: true,
        mkTahun: true,
        mkBulan: true,
        jenisJabatanNama: true,
        jabatanNama: true,
        tmtJabatan: true,
        tingkatPendidikanNama: true,
        pendidikanNama: true,
        tahunLulus: true,
        namaSekolah: true,
        lokasiKerjaNama: true,
        unorNama: true,
        instansiIndukNama: true,
        satuanKerjaKerjaNama: true,
        statusPensiun: true,
        arsipSkCpns: {
          select: { id: true, nomorSk: true, tanggalSk: true, fileUrl: true }
        },
        unorInduk: {
          select: { id: true, nama: true }
        }
      }
    });
  }

  /**
   * Ambil riwayat kontrak milik pegawai
   */
  async getRiwayatKontrak(filter) {
    return prisma.riwayatKontrak.findMany({
      where: {
        ...filter,
        isDeleted: false
      },
      select: {
        id: true,
        kontrakKe: true,
        nomorKontrak: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        gajiPokok: true,
        golongan: true,
        mkTahun: true,
        mkBulan: true,
        keterangan: true,
        arsipKontrak: {
          select: { id: true, namaFile: true, fileUrl: true }
        }
      },
      orderBy: { kontrakKe: 'asc' }
    });
  }

  /**
   * Ambil riwayat keluarga milik pegawai
   */
  async getRiwayatKeluarga(filter) {
    return prisma.riwayatKeluarga.findMany({
      where: {
        ...filter,
        isDeleted: false
      },
      select: {
        id: true,
        hubungan: true,
        nama: true,
        nik: true,
        tempatLahir: true,
        tanggalLahir: true,
        jenisKelamin: true,
        pekerjaan: true,
        statusHidup: true,
        tanggalMenikah: true,
        nomorAktaNikah: true,
        nomorAktaLahir: true,
        isTanggungan: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Ambil usulan perpanjangan aktif (untuk Penuh Waktu)
   */
  async getUsulanPerpanjanganAktif(dataP3kId) {
    return prisma.usulanPerpanjangan.findFirst({
      where: {
        dataP3kId,
        isDeleted: false
      },
      select: {
        id: true,
        nomorKontrak: true,
        kontrakKe: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        tanggalTtd: true,
        status: true,
        statusSrikandi: true,
        alasanPenolakan: true,
        generatedFileUrl: true,
        finalFileUrl: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export default new PortalRepository();
