import request from 'supertest';
import app from '../../src/app.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Portal Auth & Aktivasi Mandiri API Tests', () => {
  let dummyPenuhWaktu;
  let dummyParuhWaktu;

  beforeAll(async () => {
    // 1. Buat dummy DataP3k (Penuh Waktu)
    dummyPenuhWaktu = await prisma.dataP3k.create({
      data: {
        nipBaru: '199501012024211001',
        pnsId: 'PNS-TEST-001',
        nama: 'Ahmad Penuh Waktu',
        nik: '7205010101950001',
        tanggalLahir: '1995-01-01',
        statusPensiun: 'AKTIF',
        email: 'ahmad.penuh@test.id',
        nomorHp: '081234567890',
        alamat: 'Jl. Merdeka No. 1'
      }
    });

    // 2. Buat dummy DataP3kParuhWaktu (Paruh Waktu)
    dummyParuhWaktu = await prisma.dataP3kParuhWaktu.create({
      data: {
        nipBaru: '199602022024212002',
        pnsId: 'PNS-TEST-002',
        nama: 'Siti Paruh Waktu',
        nik: '7205010202960002',
        tanggalLahir: '1996-02-02',
        statusPensiun: 'AKTIF',
        email: 'siti.paruh@test.id',
        nomorHp: '081298765432',
        alamat: 'Jl. Melati No. 2'
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.activityLog.deleteMany({
      where: { action: 'AKTIVASI_AKUN_PEGAWAI' }
    });
    await prisma.user.deleteMany({
      where: { username: { in: ['199501012024211001', '199602022024212002'] } }
    });
    await prisma.aktivasiPegawaiToken.deleteMany({
      where: { nipBaru: { in: ['199501012024211001', '199602022024212002'] } }
    });
    await prisma.dataP3k.deleteMany({
      where: { id: dummyPenuhWaktu?.id }
    });
    await prisma.dataP3kParuhWaktu.deleteMany({
      where: { id: dummyParuhWaktu?.id }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/portal/auth/cek', () => {
    it('harus berhasil memvalidasi pegawai Penuh Waktu', async () => {
      const res = await request(app)
        .post('/api/v1/portal/auth/cek')
        .send({
          nipBaru: '199501012024211001',
          nik: '7205010101950001',
          tanggalLahir: '1995-01-01'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jenisPegawai).toBe('PENUH_WAKTU');
      expect(res.body.data.nama).toBe('Ahmad Penuh Waktu');
    });

    it('harus berhasil memvalidasi pegawai Paruh Waktu', async () => {
      const res = await request(app)
        .post('/api/v1/portal/auth/cek')
        .send({
          nipBaru: '199602022024212002',
          nik: '7205010202960002',
          tanggalLahir: '1996-02-02'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jenisPegawai).toBe('PARUH_WAKTU');
      expect(res.body.data.nama).toBe('Siti Paruh Waktu');
    });

    it('harus menolak bila NIK tidak cocok', async () => {
      const res = await request(app)
        .post('/api/v1/portal/auth/cek')
        .send({
          nipBaru: '199501012024211001',
          nik: '1111111111111111',
          tanggalLahir: '1995-01-01'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('harus menolak bila tanggal lahir tidak cocok', async () => {
      const res = await request(app)
        .post('/api/v1/portal/auth/cek')
        .send({
          nipBaru: '199501012024211001',
          nik: '7205010101950001',
          tanggalLahir: '1990-12-31'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Alur Kirim OTP & Verifikasi Akun', () => {
    it('harus berhasil mengirimkan OTP dan membuat token aktivasi', async () => {
      const res = await request(app)
        .post('/api/v1/portal/auth/kirim-otp')
        .send({
          nipBaru: '199501012024211001',
          nik: '7205010101950001',
          tanggalLahir: '1995-01-01',
          email: 'ahmad.akt@test.id'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Cek token tersimpan di DB
      const tokenInDb = await prisma.aktivasiPegawaiToken.findFirst({
        where: { nipBaru: '199501012024211001', usedAt: null }
      });
      expect(tokenInDb).toBeDefined();
      expect(tokenInDb.email).toBe('ahmad.akt@test.id');
    });

    it('harus menolak kirim OTP jika email sudah digunakan oleh user lain', async () => {
      // Buat user dummy dengan email lain
      const existingUser = await prisma.user.create({
        data: {
          username: 'user_lain_test',
          email: 'email.duplikat@test.id',
          password: 'hashedpassword',
          role: 'user'
        }
      });

      const res = await request(app)
        .post('/api/v1/portal/auth/kirim-otp')
        .send({
          nipBaru: '199501012024211001',
          nik: '7205010101950001',
          tanggalLahir: '1995-01-01',
          email: 'email.duplikat@test.id'
        });

      // Cleanup user dummy
      await prisma.user.delete({ where: { id: existingUser.id } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('sudah digunakan oleh pengguna lain');
    });

    it('harus menolak verifikasi jika kode OTP salah dan menambah attempts', async () => {
      const res = await request(app)
        .post('/api/v1/portal/auth/verifikasi')
        .send({
          nipBaru: '199501012024211001',
          otp: '000000',
          password: 'Password123',
          konfirmasiPassword: 'Password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Kode OTP salah');

      const tokenInDb = await prisma.aktivasiPegawaiToken.findFirst({
        where: { nipBaru: '199501012024211001', usedAt: null }
      });
      expect(tokenInDb.attempts).toBe(1);
    });

    it('harus berhasil verifikasi OTP dan membuat akun User baru', async () => {
      // Set OTP yang diketahui di DB
      const salt = await bcrypt.genSalt(10);
      const knownOtpHash = await bcrypt.hash('123456', salt);
      await prisma.aktivasiPegawaiToken.updateMany({
        where: { nipBaru: '199501012024211001', usedAt: null },
        data: { otpHash: knownOtpHash }
      });

      const res = await request(app)
        .post('/api/v1/portal/auth/verifikasi')
        .send({
          nipBaru: '199501012024211001',
          otp: '123456',
          password: 'PasswordBaru123',
          konfirmasiPassword: 'PasswordBaru123'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('199501012024211001');
      expect(res.body.data.role).toBe('pegawai');
      expect(res.body.data.jenisPegawaiPortal).toBe('PENUH_WAKTU');
      expect(res.body.data.dataP3kId).toBe(dummyPenuhWaktu.id);

      // Cek login dengan akun baru
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          username: '199501012024211001',
          password: 'PasswordBaru123'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.role).toBe('pegawai');
      expect(loginRes.body.data.user.dataP3kId).toBe(dummyPenuhWaktu.id);
      expect(loginRes.body.data.token).toBeDefined();
    });

    it('harus menolak cek / aktivasi ulang karena akun sudah aktif', async () => {
      const res = await request(app)
        .post('/api/v1/portal/auth/cek')
        .send({
          nipBaru: '199501012024211001',
          nik: '7205010101950001',
          tanggalLahir: '1995-01-01'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('sudah aktif terdaftar');
    });

    it('harus berhasil reaktivasi akun pegawai yang pernah di-soft delete tanpa terkena constraint users_dataP3kId_key', async () => {
      // Simulasikan user di-soft delete oleh admin di manajemen user
      const currentUser = await prisma.user.findFirst({
        where: { dataP3kId: dummyPenuhWaktu.id }
      });
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          isDeleted: true,
          username: `${currentUser.username}_del_${Date.now()}`,
          email: `${currentUser.email}_del_${Date.now()}`
        }
      });

      // 1. Cek Pegawai harus berhasil (karena akun lama non-aktif)
      const cekRes = await request(app)
        .post('/api/v1/portal/auth/cek')
        .send({
          nipBaru: '199501012024211001',
          nik: '7205010101950001',
          tanggalLahir: '1995-01-01'
        });
      expect(cekRes.status).toBe(200);

      // 2. Kirim OTP baru
      const otpRes = await request(app)
        .post('/api/v1/portal/auth/kirim-otp')
        .send({
          nipBaru: '199501012024211001',
          nik: '7205010101950001',
          tanggalLahir: '1995-01-01',
          email: 'ahmad.reaktivasi@test.id'
        });
      expect(otpRes.status).toBe(200);

      // Set hash OTP yang diketahui
      const salt = await bcrypt.genSalt(10);
      const knownOtpHash = await bcrypt.hash('654321', salt);
      const token = await prisma.aktivasiPegawaiToken.findFirst({
        where: { nipBaru: '199501012024211001', usedAt: null },
        orderBy: { createdAt: 'desc' }
      });
      await prisma.aktivasiPegawaiToken.update({
        where: { id: token.id },
        data: { otpHash: knownOtpHash }
      });

      // 3. Verifikasi OTP & Aktivasi ulang
      const verifRes = await request(app)
        .post('/api/v1/portal/auth/verifikasi')
        .send({
          nipBaru: '199501012024211001',
          otp: '654321',
          password: 'PasswordBaruReaktif456',
          konfirmasiPassword: 'PasswordBaruReaktif456'
        });

      expect(verifRes.status).toBe(201);
      expect(verifRes.body.success).toBe(true);
      expect(verifRes.body.data.username).toBe('199501012024211001');
      expect(verifRes.body.data.email).toBe('ahmad.reaktivasi@test.id');

      // 4. Verifikasi akun lama sekarang sudah aktif kembali (isDeleted: false)
      const userInDb = await prisma.user.findUnique({
        where: { id: currentUser.id }
      });
      expect(userInDb.isDeleted).toBe(false);
      expect(userInDb.username).toBe('199501012024211001');
    });
  });
});
