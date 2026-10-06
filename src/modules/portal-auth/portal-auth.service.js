import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import portalAuthRepository from './portal-auth.repository.js';
import { sendOtpActivationEmail } from '../../utils/email.service.js';

function cleanDigits(str) {
  if (!str) return '';
  return String(str).replace(/\D/g, '').trim();
}

function normalizeDate(str) {
  if (!str) return '';
  const clean = String(str).replace(/['"`]/g, '').trim();
  // Format DD-MM-YYYY atau DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Format YYYY-MM-DD atau YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return clean.replace(/\D/g, '');
}

function datesMatch(d1, d2) {
  const norm1 = normalizeDate(d1);
  const norm2 = normalizeDate(d2);
  if (norm1 && norm2 && norm1 === norm2) return true;
  const digits1 = cleanDigits(d1);
  const digits2 = cleanDigits(d2);
  return digits1 === digits2 && digits1.length >= 6;
}

function formatNamaLengkap(p) {
  const depan = p.gelarDepan?.trim() ? `${p.gelarDepan.trim()} ` : '';
  const nama = p.nama?.trim() || '';
  const belakang = p.gelarBelakang?.trim() ? `, ${p.gelarBelakang.trim()}` : '';
  return `${depan}${nama}${belakang}`.trim() || nama;
}

class PortalAuthService {
  /**
   * Langkah 1: Cek kesesuaian NIP, NIK, dan Tanggal Lahir
   */
  async cekPegawai({ nipBaru, nik, tanggalLahir }) {
    const found = await portalAuthRepository.findActivePegawaiByNip(nipBaru);
    if (!found) {
      const err = new Error('Data pegawai tidak ditemukan atau status kepegawaian tidak aktif');
      err.statusCode = 404;
      throw err;
    }

    const { jenisPegawai, pegawai } = found;

    // Cek apakah akun aktif sudah pernah dibuat
    const existingActiveUser = await portalAuthRepository.findActiveUserByPegawai({
      nipBaru,
      dataP3kId: jenisPegawai === 'PENUH_WAKTU' ? pegawai.id : null,
      dataP3kParuhWaktuId: jenisPegawai === 'PARUH_WAKTU' ? pegawai.id : null
    });
    if (existingActiveUser) {
      const err = new Error('Akun untuk NIP ini sudah aktif terdaftar. Silakan langsung login menggunakan NIP Anda atau gunakan fitur Lupa Password jika lupa kata sandi.');
      err.statusCode = 400;
      throw err;
    }

    // Cocokkan NIK (sanitasi dari tanda petik atau karakter non-digit)
    const dbNik = cleanDigits(pegawai.nik);
    const inputNik = cleanDigits(nik);
    if (!dbNik || !inputNik || dbNik !== inputNik) {
      const err = new Error('Data NIP, NIK, atau Tanggal Lahir tidak cocok. Silakan periksa kembali data Anda.');
      err.statusCode = 400;
      throw err;
    }

    // Cocokkan Tanggal Lahir
    if (!datesMatch(pegawai.tanggalLahir, tanggalLahir)) {
      const err = new Error('Data NIP, NIK, atau Tanggal Lahir tidak cocok. Silakan periksa kembali data Anda.');
      err.statusCode = 400;
      throw err;
    }

    return {
      nipBaru: pegawai.nipBaru,
      nama: formatNamaLengkap(pegawai),
      jenisPegawai,
      defaultEmail: pegawai.email || null
    };
  }

  /**
   * Langkah 2: Kirim kode OTP 6 digit ke email
   */
  async kirimOtp({ nipBaru, nik, tanggalLahir, email }) {
    // Validasi ulang identitas
    const verified = await this.cekPegawai({ nipBaru, nik, tanggalLahir });

    const found = await portalAuthRepository.findActivePegawaiByNip(nipBaru);
    const { jenisPegawai, pegawai } = found;

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
      const err = new Error('Alamat email wajib diisi');
      err.statusCode = 400;
      throw err;
    }

    // Cek apakah alamat email sudah digunakan oleh user lain di database
    const userWithEmail = await portalAuthRepository.findUserByEmail(cleanEmail);
    if (userWithEmail) {
      if (
        userWithEmail.username === String(nipBaru).trim() ||
        (jenisPegawai === 'PENUH_WAKTU' && userWithEmail.dataP3kId === pegawai.id) ||
        (jenisPegawai === 'PARUH_WAKTU' && userWithEmail.dataP3kParuhWaktuId === pegawai.id)
      ) {
        const err = new Error('Akun Anda sudah aktif terdaftar dengan email ini. Silakan langsung masuk di halaman Login atau gunakan fitur Lupa Password jika lupa kata sandi.');
        err.statusCode = 400;
        throw err;
      } else {
        const err = new Error(`Alamat email '${cleanEmail}' sudah digunakan oleh pengguna lain di sistem. Silakan gunakan alamat email pribadi Anda yang belum terdaftar.`);
        err.statusCode = 400;
        throw err;
      }
    }

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otpCode, salt);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    await portalAuthRepository.createOtpToken({
      nipBaru: pegawai.nipBaru,
      jenisPegawai,
      dataPegawaiId: pegawai.id,
      email: cleanEmail,
      otpHash,
      expiresAt
    });

    // Kirim email
    await sendOtpActivationEmail(cleanEmail, otpCode, verified.nama);

    return {
      message: 'Kode OTP 6-digit telah dikirimkan ke email Anda. Silakan periksa inbox atau spam.',
      email: cleanEmail
    };
  }

  /**
   * Langkah 3: Verifikasi OTP dan buat akun pegawai
   */
  async verifikasiOtpDanBuatAkun({ nipBaru, otp, password }) {
    const found = await portalAuthRepository.findActivePegawaiByNip(nipBaru);
    if (!found) {
      const err = new Error('Data pegawai tidak ditemukan');
      err.statusCode = 404;
      throw err;
    }

    const { jenisPegawai, pegawai } = found;

    const existingActiveUser = await portalAuthRepository.findActiveUserByPegawai({
      nipBaru,
      dataP3kId: jenisPegawai === 'PENUH_WAKTU' ? pegawai.id : null,
      dataP3kParuhWaktuId: jenisPegawai === 'PARUH_WAKTU' ? pegawai.id : null
    });
    if (existingActiveUser) {
      const err = new Error('Akun untuk NIP ini sudah aktif terdaftar');
      err.statusCode = 400;
      throw err;
    }

    const token = await portalAuthRepository.findLatestActiveOtpToken(nipBaru);
    if (!token) {
      const err = new Error('Kode OTP tidak ditemukan atau belum diminta. Silakan minta kode OTP terlebih dahulu.');
      err.statusCode = 400;
      throw err;
    }

    if (token.attempts >= 5) {
      const err = new Error('Batas percobaan verifikasi telah terlampaui (maksimal 5 kali). Silakan minta kode OTP baru.');
      err.statusCode = 400;
      throw err;
    }

    if (new Date() > new Date(token.expiresAt)) {
      const err = new Error('Kode OTP telah kadaluarsa (melebihi 10 menit). Silakan minta kode OTP baru.');
      err.statusCode = 400;
      throw err;
    }

    const isMatch = await bcrypt.compare(otp.trim(), token.otpHash);
    if (!isMatch) {
      await portalAuthRepository.incrementAttempts(token.id);
      const sisa = Math.max(0, 4 - token.attempts);
      const err = new Error(`Kode OTP salah. Sisa kesempatan percobaan: ${sisa} kali.`);
      err.statusCode = 400;
      throw err;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      username: pegawai.nipBaru,
      email: token.email,
      password: hashedPassword,
      namaLengkap: formatNamaLengkap(pegawai),
      role: 'pegawai',
      jenisPegawaiPortal: jenisPegawai,
      dataP3kId: jenisPegawai === 'PENUH_WAKTU' ? pegawai.id : null,
      dataP3kParuhWaktuId: jenisPegawai === 'PARUH_WAKTU' ? pegawai.id : null,
      mustChangePassword: false
    };

    try {
      const createdUser = await portalAuthRepository.createPegawaiAccount(userData, token.id);

      return {
        message: 'Aktivasi akun berhasil! Anda sekarang dapat login menggunakan NIP dan password baru.',
        user: createdUser
      };
    } catch (dbErr) {
      if (dbErr.code === 'P2002') {
        const target = JSON.stringify(dbErr.meta?.target || '');
        if (target.includes('email') || target.includes('users_email_key')) {
          const err = new Error(`Alamat email '${token.email}' sudah terdaftar pada akun lain. Silakan ulangi aktivasi dengan alamat email yang berbeda.`);
          err.statusCode = 400;
          throw err;
        }
        if (target.includes('username') || target.includes('users_username_key')) {
          const err = new Error(`Akun untuk NIP '${userData.username}' sudah terdaftar. Silakan langsung menuju halaman Login.`);
          err.statusCode = 400;
          throw err;
        }
        if (target.includes('dataP3kId') || target.includes('users_dataP3kId_key') || target.includes('dataP3kParuhWaktuId')) {
          const err = new Error('Data kepegawaian Anda sudah terhubung dengan akun lain. Silakan hubungi Administrator.');
          err.statusCode = 400;
          throw err;
        }
      }
      throw dbErr;
    }
  }
}

export default new PortalAuthService();
