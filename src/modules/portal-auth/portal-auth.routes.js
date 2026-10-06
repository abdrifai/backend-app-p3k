import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import portalAuthController from './portal-auth.controller.js';

const router = Router();

// Rate limiter khusus aktivasi untuk mencegah brute-force
const aktivasiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // Maks 20 request per IP per 15 menit
  message: {
    success: false,
    message: 'Terlalu banyak permintaan aktivasi dari IP ini. Silakan coba lagi setelah 15 menit.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: 5, // Maks 5 permintaan OTP per 10 menit
  message: {
    success: false,
    message: 'Terlalu banyak permintaan pengiriman OTP. Silakan tunggu beberapa menit.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @swagger
 * tags:
 *   name: Portal Auth
 *   description: Aktivasi mandiri dan otentikasi portal pegawai PPPK
 */

/**
 * @swagger
 * /api/v1/portal/auth/cek:
 *   post:
 *     summary: Cek kecocokan data pegawai (NIP, NIK, Tanggal Lahir)
 *     tags: [Portal Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nipBaru
 *               - nik
 *               - tanggalLahir
 *             properties:
 *               nipBaru:
 *                 type: string
 *               nik:
 *                 type: string
 *               tanggalLahir:
 *                 type: string
 *                 example: "1990-05-15"
 *     responses:
 *       200:
 *         description: Data pegawai valid
 *       400:
 *         description: Data tidak cocok atau akun sudah terdaftar
 *       404:
 *         description: Data pegawai tidak ditemukan
 */
router.post('/cek', aktivasiRateLimiter, portalAuthController.cekPegawai);

/**
 * @swagger
 * /api/v1/portal/auth/kirim-otp:
 *   post:
 *     summary: Kirim kode OTP aktivasi 6 digit ke email
 *     tags: [Portal Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nipBaru
 *               - nik
 *               - tanggalLahir
 *               - email
 *             properties:
 *               nipBaru:
 *                 type: string
 *               nik:
 *                 type: string
 *               tanggalLahir:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Kode OTP berhasil dikirim
 *       400:
 *         description: Data tidak cocok
 */
router.post('/kirim-otp', otpRateLimiter, portalAuthController.kirimOtp);

/**
 * @swagger
 * /api/v1/portal/auth/verifikasi:
 *   post:
 *     summary: Verifikasi OTP dan set password untuk pembuatan akun pegawai
 *     tags: [Portal Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nipBaru
 *               - otp
 *               - password
 *               - konfirmasiPassword
 *             properties:
 *               nipBaru:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               password:
 *                 type: string
 *               konfirmasiPassword:
 *                 type: string
 *     responses:
 *       201:
 *         description: Akun pegawai berhasil dibuat
 *       400:
 *         description: OTP salah, kadaluarsa, atau password tidak valid
 */
router.post('/verifikasi', aktivasiRateLimiter, portalAuthController.verifikasiOtp);

export const portalAuthRoutes = router;
export default router;
