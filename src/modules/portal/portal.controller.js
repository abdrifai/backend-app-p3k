import portalService from './portal.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

class PortalController {
  /**
   * Ambil data profil pegawai milik sendiri
   */
  getMyProfile = asyncHandler(async (req, res) => {
    const data = await portalService.getMyProfile(req.pegawai);
    res.status(200).json({
      success: true,
      message: 'Berhasil memuat data profil pegawai',
      data
    });
  });

  /**
   * Ambil daftar riwayat kontrak milik sendiri
   */
  getMyRiwayatKontrak = asyncHandler(async (req, res) => {
    const data = await portalService.getMyRiwayatKontrak(req.pegawai);
    res.status(200).json({
      success: true,
      message: 'Berhasil memuat riwayat kontrak',
      data
    });
  });

  /**
   * Ambil daftar riwayat keluarga milik sendiri
   */
  getMyKeluarga = asyncHandler(async (req, res) => {
    const data = await portalService.getMyKeluarga(req.pegawai);
    res.status(200).json({
      success: true,
      message: 'Berhasil memuat riwayat keluarga',
      data
    });
  });

  /**
   * Ambil data SK pengangkatan pertama milik sendiri
   */
  getMySkPengangkatan = asyncHandler(async (req, res) => {
    const data = await portalService.getMySkPengangkatan(req.pegawai);
    res.status(200).json({
      success: true,
      message: 'Berhasil memuat data SK pengangkatan pertama',
      data
    });
  });

  /**
   * Ambil status usulan perpanjangan kontrak aktif
   */
  getMyPerpanjangan = asyncHandler(async (req, res) => {
    const data = await portalService.getMyPerpanjangan(req.pegawai);
    res.status(200).json({
      success: true,
      message: 'Berhasil memuat status perpanjangan kontrak',
      data
    });
  });
}

export default new PortalController();
