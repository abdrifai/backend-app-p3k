import portalRepository from './portal.repository.js';

class PortalService {
  /**
   * Profil lengkap pegawai milik sendiri
   */
  async getMyProfile(pegawai) {
    let data;
    if (pegawai.jenisPegawai === 'PENUH_WAKTU') {
      data = await portalRepository.getPenuhWaktuById(pegawai.id);
    } else {
      data = await portalRepository.getParuhWaktuById(pegawai.id);
    }

    if (!data) {
      const err = new Error('Data profil pegawai tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    return {
      ...data,
      jenisPegawaiPortal: pegawai.jenisPegawai
    };
  }

  /**
   * Riwayat kontrak pegawai milik sendiri
   */
  async getMyRiwayatKontrak(pegawai) {
    const filter = pegawai.jenisPegawai === 'PENUH_WAKTU'
      ? { dataP3kId: pegawai.id }
      : { dataP3kParuhWaktuId: pegawai.id };

    return await portalRepository.getRiwayatKontrak(filter);
  }

  /**
   * Riwayat keluarga pegawai milik sendiri
   */
  async getMyKeluarga(pegawai) {
    const filter = pegawai.jenisPegawai === 'PENUH_WAKTU'
      ? { dataP3kId: pegawai.id }
      : { dataP3kParuhWaktuId: pegawai.id };

    return await portalRepository.getRiwayatKeluarga(filter);
  }

  /**
   * Data SK Pengangkatan pertama milik sendiri
   */
  async getMySkPengangkatan(pegawai) {
    const profile = await this.getMyProfile(pegawai);
    return {
      nomorSkCpns: profile.nomorSkCpns || null,
      tanggalSkCpns: profile.tanggalSkCpns || null,
      tmtCpns: profile.tmtCpns || null,
      arsipSkCpns: profile.arsipSkCpns || null
    };
  }

  /**
   * Status perpanjangan kontrak aktif (hanya berlaku untuk Penuh Waktu)
   */
  async getMyPerpanjangan(pegawai) {
    if (pegawai.jenisPegawai !== 'PENUH_WAKTU') {
      return null;
    }

    return await portalRepository.getUsulanPerpanjanganAktif(pegawai.id);
  }
}

export default new PortalService();
