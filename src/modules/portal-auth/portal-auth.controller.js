import portalAuthService from './portal-auth.service.js';
import { cekPegawaiSchema, kirimOtpSchema, verifikasiOtpSchema } from './portal-auth.validation.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

class PortalAuthController {
  /**
   * Cek kecocokan data pegawai untuk aktivasi akun
   */
  cekPegawai = asyncHandler(async (req, res) => {
    const { error, value } = cekPegawaiSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const data = await portalAuthService.cekPegawai(value);
    res.status(200).json({
      success: true,
      message: 'Data pegawai valid. Silakan lanjutkan verifikasi email.',
      data
    });
  });

  /**
   * Kirim kode OTP aktivasi ke email
   */
  kirimOtp = asyncHandler(async (req, res) => {
    const { error, value } = kirimOtpSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const result = await portalAuthService.kirimOtp(value);
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        email: result.email
      }
    });
  });

  /**
   * Verifikasi OTP dan buat akun pegawai
   */
  verifikasiOtp = asyncHandler(async (req, res) => {
    const { error, value } = verifikasiOtpSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const result = await portalAuthService.verifikasiOtpDanBuatAkun(value);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.user
    });
  });
}

export default new PortalAuthController();
