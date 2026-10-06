import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

describe('Portal Perbaikan Data & Verifikator Integration Tests', () => {
  let pegawaiToken;
  let verifikatorToken;
  let pegawaiUser;
  let verifikatorUser;
  let dataP3k;

  beforeAll(async () => {
    // Bersihkan dulu jika ada data sisa sebelumnya
    const existingP3k = await prisma.dataP3k.findFirst({
      where: { nipBaru: '199501012024011099' }
    });
    if (existingP3k) {
      await prisma.lampiranPerbaikan.deleteMany({ where: { usulan: { dataP3kId: existingP3k.id } } }).catch(() => {});
      await prisma.riwayatStatusPerbaikan.deleteMany({ where: { usulan: { dataP3kId: existingP3k.id } } }).catch(() => {});
      await prisma.usulanPerbaikanData.deleteMany({ where: { dataP3kId: existingP3k.id } }).catch(() => {});
      await prisma.riwayatKeluarga.deleteMany({ where: { dataP3kId: existingP3k.id } }).catch(() => {});
      await prisma.activityLog.deleteMany({ where: { user: { username: '199501012024011099' } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { username: '199501012024011099' } }).catch(() => {});
      await prisma.dataP3k.delete({ where: { id: existingP3k.id } }).catch(() => {});
    }
    await prisma.activityLog.deleteMany({ where: { user: { username: 'verifikator_test' } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { username: 'verifikator_test' } }).catch(() => {});

    // 1. Buat data pegawai P3K
    dataP3k = await prisma.dataP3k.create({
      data: {
        pnsId: 'PNS-TEST-PRB-99',
        nipBaru: '199501012024011099',
        nama: 'Test Pegawai Perbaikan',
        statusPensiun: 'AKTIF',
        nomorHp: '081234567890',
        email: 'pegawai.perbaikan@example.com',
        alamat: 'Jl. Pegawai No. 1'
      }
    });

    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // 2. Buat akun user pegawai
    pegawaiUser = await prisma.user.create({
      data: {
        username: '199501012024011099',
        email: 'pegawai.perbaikan@example.com',
        password: hashedPassword,
        namaLengkap: 'Test Pegawai Perbaikan',
        role: 'pegawai',
        dataP3kId: dataP3k.id,
        jenisPegawaiPortal: 'PENUH_WAKTU'
      }
    });

    // 3. Buat akun user verifikator
    verifikatorUser = await prisma.user.create({
      data: {
        username: 'verifikator_test',
        email: 'verifikator.test@example.com',
        password: hashedPassword,
        namaLengkap: 'Verifikator Test SIPPPK',
        role: 'verifikator'
      }
    });

    // Generate JWT token
    pegawaiToken = jwt.sign(
      { id: pegawaiUser.id, username: pegawaiUser.username, role: pegawaiUser.role },
      process.env.JWT_SECRET || 'testsecretkey',
      { expiresIn: '1h' }
    );

    verifikatorToken = jwt.sign(
      { id: verifikatorUser.id, username: verifikatorUser.username, role: verifikatorUser.role },
      process.env.JWT_SECRET || 'testsecretkey',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Bersihkan data
    if (dataP3k?.id) {
      await prisma.lampiranPerbaikan.deleteMany({
        where: { usulan: { dataP3kId: dataP3k.id } }
      }).catch(() => {});
      await prisma.riwayatStatusPerbaikan.deleteMany({
        where: { usulan: { dataP3kId: dataP3k.id } }
      }).catch(() => {});
      await prisma.usulanPerbaikanData.deleteMany({
        where: { dataP3kId: dataP3k.id }
      }).catch(() => {});
      await prisma.riwayatKeluarga.deleteMany({
        where: { dataP3kId: dataP3k.id }
      }).catch(() => {});
    }

    if (pegawaiUser?.id) {
      await prisma.activityLog.deleteMany({
        where: { userId: pegawaiUser.id }
      }).catch(() => {});
      await prisma.user.delete({ where: { id: pegawaiUser.id } }).catch(() => {});
    }

    if (verifikatorUser?.id) {
      await prisma.activityLog.deleteMany({
        where: { userId: verifikatorUser.id }
      }).catch(() => {});
      await prisma.user.delete({ where: { id: verifikatorUser.id } }).catch(() => {});
    }

    if (dataP3k?.id) {
      await prisma.dataP3k.delete({ where: { id: dataP3k.id } }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  test('GET /api/v1/portal/perbaikan/aturan - Harus mengembalikan aturan & whitelist usulan', async () => {
    const res = await request(app)
      .get('/api/v1/portal/perbaikan/aturan')
      .set('Authorization', `Bearer ${pegawaiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.DATA_UTAMA).toBeDefined();
    expect(res.body.data.DATA_UTAMA.fieldDiizinkan).toEqual(['nomorHp', 'email', 'alamat']);
  });

  let createdUsulanId;

  test('POST /api/v1/portal/perbaikan - Pegawai berhasil mengajukan usulan DATA_UTAMA', async () => {
    const res = await request(app)
      .post('/api/v1/portal/perbaikan')
      .set('Authorization', `Bearer ${pegawaiToken}`)
      .field('kategori', 'DATA_UTAMA')
      .field('aksi', 'UBAH')
      .field('alasan', 'Pindah rumah dan ganti nomor HP baru')
      .field('dataBaru', JSON.stringify({
        nomorHp: '08999999999',
        alamat: 'Jl. Rumah Baru No. 99',
        gajiPokok: 5000000 // Field liar ini harus diabaikan/difilter oleh whitelist!
      }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nomorUsulan).toMatch(/^PRB-/);
    expect(res.body.data.status).toBe('DIAJUKAN');

    createdUsulanId = res.body.data.id;

    // Cek di DB bahwa dataBaru tidak menyimpan field gajiPokok
    const dbUsulan = await prisma.usulanPerbaikanData.findUnique({
      where: { id: createdUsulanId }
    });
    expect(dbUsulan.dataBaru.nomorHp).toBe('08999999999');
    expect(dbUsulan.dataBaru.alamat).toBe('Jl. Rumah Baru No. 99');
    expect(dbUsulan.dataBaru.gajiPokok).toBeUndefined();
  });

  test('Security: Pegawai ditolak saat mencoba akses inbox verifikator', async () => {
    const res = await request(app)
      .get('/api/v1/verifikasi-perbaikan')
      .set('Authorization', `Bearer ${pegawaiToken}`);

    expect(res.status).toBe(403);
  });

  test('GET /api/v1/verifikasi-perbaikan - Verifikator dapat melihat inbox dan statistik', async () => {
    const res = await request(app)
      .get('/api/v1/verifikasi-perbaikan')
      .set('Authorization', `Bearer ${verifikatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const statRes = await request(app)
      .get('/api/v1/verifikasi-perbaikan/statistik')
      .set('Authorization', `Bearer ${verifikatorToken}`);

    expect(statRes.status).toBe(200);
    expect(statRes.body.data.DIAJUKAN).toBeGreaterThanOrEqual(1);
  });

  test('PATCH /api/v1/verifikasi-perbaikan/:id/proses - Verifikator memproses usulan', async () => {
    const res = await request(app)
      .patch(`/api/v1/verifikasi-perbaikan/${createdUsulanId}/proses`)
      .set('Authorization', `Bearer ${verifikatorToken}`)
      .send({ catatan: 'Sedang dicek dokumen' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DIPROSES');
  });

  test('POST /api/v1/verifikasi-perbaikan/:id/setujui - Verifikator menyetujui usulan & data terupdate', async () => {
    const res = await request(app)
      .post(`/api/v1/verifikasi-perbaikan/${createdUsulanId}/setujui`)
      .set('Authorization', `Bearer ${verifikatorToken}`)
      .send({ catatan: 'Disetujui, data valid' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DISETUJUI');

    // Verifikasi data di DataP3k benar-benar terupdate
    const updatedDataP3k = await prisma.dataP3k.findUnique({
      where: { id: dataP3k.id }
    });
    expect(updatedDataP3k.nomorHp).toBe('08999999999');
    expect(updatedDataP3k.alamat).toBe('Jl. Rumah Baru No. 99');
  });
});
