import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

describe('Integrasi TTE BSrE (Pegawai, Kaban, Sekda, Bupati) Tests', () => {
  let pegawaiToken, kabanToken, sekdaToken, bupatiToken, adminToken;
  let pegawaiUser, kabanUser, sekdaUser, bupatiUser, adminUser, calonSekdaUser;
  let dataP3k;
  let usulanPerpanjangan;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // 1. Data Pegawai
    dataP3k = await prisma.dataP3k.create({
      data: {
        pnsId: 'PNS-TTE-TEST-1',
        nipBaru: '199001012024011001',
        nik: '3201010101900001',
        nama: 'Ahmad Pegawai TTE',
        statusPensiun: 'AKTIF'
      }
    });

    pegawaiUser = await prisma.user.create({
      data: {
        username: '199001012024011001',
        email: 'ahmad.tte@example.com',
        password: hashedPassword,
        namaLengkap: 'Ahmad Pegawai TTE',
        role: 'pegawai',
        dataP3kId: dataP3k.id,
        jenisPegawaiPortal: 'PENUH_WAKTU'
      }
    });

    // 2. Pejabat Kaban
    kabanUser = await prisma.user.create({
      data: {
        username: 'kaban_bkpsdm',
        email: 'kaban@example.com',
        password: hashedPassword,
        namaLengkap: 'Drs. H. Kaban BKPSDM, M.Si',
        role: 'pejabat_ttd'
      }
    });
    await prisma.pejabatPenandatangan.create({
      data: {
        userId: kabanUser.id,
        jabatan: 'KEPALA_BKPSDM',
        nama: 'Drs. H. Kaban BKPSDM, M.Si',
        nik: '3201010101700001',
        jenis: 'PARAF',
        urutan: 1
      }
    });

    // 3. Pejabat Sekda
    sekdaUser = await prisma.user.create({
      data: {
        username: 'sekda_daerah',
        email: 'sekda@example.com',
        password: hashedPassword,
        namaLengkap: 'Ir. H. Sekda Daerah, MM',
        role: 'pejabat_ttd'
      }
    });
    await prisma.pejabatPenandatangan.create({
      data: {
        userId: sekdaUser.id,
        jabatan: 'SEKDA',
        nama: 'Ir. H. Sekda Daerah, MM',
        nik: '3201010101650001',
        jenis: 'PARAF',
        urutan: 2
      }
    });

    // 4. Pejabat Bupati
    bupatiUser = await prisma.user.create({
      data: {
        username: 'bupati_daerah',
        email: 'bupati@example.com',
        password: hashedPassword,
        namaLengkap: 'H. Bupati Daerah, S.H.',
        role: 'pejabat_ttd'
      }
    });
    await prisma.pejabatPenandatangan.create({
      data: {
        userId: bupatiUser.id,
        jabatan: 'BUPATI',
        nama: 'H. Bupati Daerah, S.H.',
        nik: '3201010101600001',
        jenis: 'TTE',
        urutan: 3
      }
    });

    // 5. Dokumen Usulan Perpanjangan siap TTE (Awal: MENUNGGU_PARAF_KABAN)
    usulanPerpanjangan = await prisma.usulanPerpanjangan.create({
      data: {
        dataP3kId: dataP3k.id,
        nomorKontrak: '800/PK-TTE/2026',
        kontrakKe: 2,
        tanggalMulai: '2026-01-01',
        tanggalSelesai: '2031-01-01',
        status: 'APPROVED',
        statusTte: 'MENUNGGU_PARAF_KABAN',
        pdfDraftUrl: '/uploads/contracts/draft_kontrak_800.pdf'
      }
    });

    // 6. RiwayatKontrak yang dibuat saat usulan di-APPROVE (simulasi approveUsulan)
    await prisma.riwayatKontrak.create({
      data: {
        dataP3kId: dataP3k.id,
        kontrakKe: 2,
        nomorKontrak: '800/PK-TTE/2026',
        tanggalMulai: '2026-01-01',
        tanggalSelesai: '2031-01-01',
        golongan: 'IX'
      }
    });

    // 7. Admin & calon pejabat (untuk uji CRUD pejabat)
    adminUser = await prisma.user.create({
      data: {
        username: 'admin_tte_test',
        email: 'admin.tte@example.com',
        password: hashedPassword,
        namaLengkap: 'Admin TTE Test',
        role: 'admin'
      }
    });
    calonSekdaUser = await prisma.user.create({
      data: {
        username: 'calon_sekda_test',
        email: 'calon.sekda@example.com',
        password: hashedPassword,
        namaLengkap: 'Calon Sekda Test',
        role: 'user'
      }
    });

    // Tokens
    const signToken = (u) => jwt.sign(
      { id: u.id, username: u.username, role: u.role },
      process.env.JWT_SECRET || 'testsecretkey',
      { expiresIn: '1h' }
    );

    pegawaiToken = signToken(pegawaiUser);
    kabanToken = signToken(kabanUser);
    sekdaToken = signToken(sekdaUser);
    bupatiToken = signToken(bupatiUser);
    adminToken = signToken(adminUser);
  });

  afterAll(async () => {
    if (usulanPerpanjangan?.id) {
      await prisma.logTandaTangan.deleteMany({ where: { usulanId: usulanPerpanjangan.id } }).catch(() => {});
      await prisma.riwayatKontrak.deleteMany({ where: { dataP3kId: dataP3k?.id } }).catch(() => {});
      await prisma.usulanPerpanjangan.delete({ where: { id: usulanPerpanjangan.id } }).catch(() => {});
    }
    if (kabanUser?.id) {
      await prisma.pejabatPenandatangan.deleteMany({ where: { userId: kabanUser.id } }).catch(() => {});
      await prisma.activityLog.deleteMany({ where: { userId: kabanUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: kabanUser.id } }).catch(() => {});
    }
    if (sekdaUser?.id) {
      await prisma.pejabatPenandatangan.deleteMany({ where: { userId: sekdaUser.id } }).catch(() => {});
      await prisma.activityLog.deleteMany({ where: { userId: sekdaUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: sekdaUser.id } }).catch(() => {});
    }
    if (bupatiUser?.id) {
      await prisma.pejabatPenandatangan.deleteMany({ where: { userId: bupatiUser.id } }).catch(() => {});
      await prisma.activityLog.deleteMany({ where: { userId: bupatiUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: bupatiUser.id } }).catch(() => {});
    }
    if (pegawaiUser?.id) {
      await prisma.activityLog.deleteMany({ where: { userId: pegawaiUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: pegawaiUser.id } }).catch(() => {});
    }
    for (const u of [adminUser, calonSekdaUser]) {
      if (u?.id) {
        await prisma.pejabatPenandatangan.deleteMany({ where: { userId: u.id } }).catch(() => {});
        await prisma.activityLog.deleteMany({ where: { userId: u.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
      }
    }
    if (dataP3k?.id) {
      await prisma.dataP3k.delete({ where: { id: dataP3k.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // TAHAP 1: KEPALA BKPSDM PARAF
  test('GET /api/v1/tte/antrian - Kepala BKPSDM melihat antrian Paraf', async () => {
    const res = await request(app)
      .get('/api/v1/tte/antrian')
      .set('Authorization', `Bearer ${kabanToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some(d => d.id === usulanPerpanjangan.id)).toBe(true);
  });

  test('POST /api/v1/tte/:id/sign - Kepala BKPSDM membubuhkan Paraf', async () => {
    const res = await request(app)
      .post(`/api/v1/tte/${usulanPerpanjangan.id}/sign`)
      .set('Authorization', `Bearer ${kabanToken}`)
      .send({ passphrase: 'PassKaban123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const doc = await prisma.usulanPerpanjangan.findUnique({
      where: { id: usulanPerpanjangan.id }
    });
    expect(doc.statusTte).toBe('MENUNGGU_PARAF_SEKDA');
  });

  // VALIDASI TAHAP: pejabat lain tidak boleh menandatangani / menolak di luar tahapnya
  test('POST /api/v1/tte/:id/sign - Bupati ditolak (400) saat dokumen masih di tahap Paraf Sekda', async () => {
    const res = await request(app)
      .post(`/api/v1/tte/${usulanPerpanjangan.id}/sign`)
      .set('Authorization', `Bearer ${bupatiToken}`)
      .send({ passphrase: 'PassBupati123!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/tte/:id/tolak - Bupati tidak bisa menolak dokumen di luar tahapnya', async () => {
    const res = await request(app)
      .post(`/api/v1/tte/${usulanPerpanjangan.id}/tolak`)
      .set('Authorization', `Bearer ${bupatiToken}`)
      .send({ catatan: 'Mencoba menolak di tahap yang salah' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const doc = await prisma.usulanPerpanjangan.findUnique({
      where: { id: usulanPerpanjangan.id }
    });
    expect(doc.statusTte).toBe('MENUNGGU_PARAF_SEKDA');
  });

  // TAHAP 2: SEKDA PARAF
  test('POST /api/v1/tte/:id/sign - Sekda membubuhkan Paraf', async () => {
    const res = await request(app)
      .post(`/api/v1/tte/${usulanPerpanjangan.id}/sign`)
      .set('Authorization', `Bearer ${sekdaToken}`)
      .send({ passphrase: 'PassSekda123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const doc = await prisma.usulanPerpanjangan.findUnique({
      where: { id: usulanPerpanjangan.id }
    });
    expect(doc.statusTte).toBe('MENUNGGU_TTE_PEGAWAI');
  });

  // TAHAP 3: PEGAWAI PPPK TTE
  test('GET /api/v1/portal/tte - Pegawai dapat melihat antrian dokumen kontrak menunggu TTE', async () => {
    const res = await request(app)
      .get('/api/v1/portal/tte')
      .set('Authorization', `Bearer ${pegawaiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].id).toBe(usulanPerpanjangan.id);
  });

  test('POST /api/v1/portal/tte/:id/sign - Pegawai gagal jika passphrase salah', async () => {
    const res = await request(app)
      .post(`/api/v1/portal/tte/${usulanPerpanjangan.id}/sign`)
      .set('Authorization', `Bearer ${pegawaiToken}`)
      .send({ passphrase: 'wrong' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/portal/tte/:id/sign - Pegawai berhasil TTE dokumen kontrak', async () => {
    const res = await request(app)
      .post(`/api/v1/portal/tte/${usulanPerpanjangan.id}/sign`)
      .set('Authorization', `Bearer ${pegawaiToken}`)
      .send({ passphrase: 'PasswordBenar123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const doc = await prisma.usulanPerpanjangan.findUnique({
      where: { id: usulanPerpanjangan.id }
    });
    expect(doc.statusTte).toBe('MENUNGGU_TTE_BUPATI');
  });

  // TAHAP 4: BUPATI TTE FINAL
  test('POST /api/v1/tte/:id/sign - Bupati menandatangani (TTE Final) & kontrak selesai otomatis', async () => {
    const res = await request(app)
      .post(`/api/v1/tte/${usulanPerpanjangan.id}/sign`)
      .set('Authorization', `Bearer ${bupatiToken}`)
      .send({ passphrase: 'PassBupati123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const doc = await prisma.usulanPerpanjangan.findUnique({
      where: { id: usulanPerpanjangan.id }
    });
    expect(doc.statusTte).toBe('TTE_SELESAI');
    expect(doc.status).toBe('SELESAI');

    // RiwayatKontrak tidak boleh terduplikasi: record dari APPROVE diperbarui dengan arsip TTE
    const riwayatList = await prisma.riwayatKontrak.findMany({
      where: { dataP3kId: dataP3k.id, nomorKontrak: '800/PK-TTE/2026', isDeleted: false }
    });
    expect(riwayatList).toHaveLength(1);
    expect(riwayatList[0].kontrakKe).toBe(2);
    expect(riwayatList[0].golongan).toBe('IX');
  });

  test('GET /api/v1/tte/riwayat - Bupati melihat riwayat penandatanganan', async () => {
    const res = await request(app)
      .get('/api/v1/tte/riwayat')
      .set('Authorization', `Bearer ${bupatiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pejabat.jabatan).toBe('BUPATI');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/v1/tte/statistik - Kepala BKPSDM melihat statistik TTE', async () => {
    const res = await request(app)
      .get('/api/v1/tte/statistik')
      .set('Authorization', `Bearer ${kabanToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('antrianCount');
    expect(res.body.data).toHaveProperty('riwayatSuksesCount');
    expect(res.body.data).toHaveProperty('riwayatTolakCount');
    expect(res.body.pejabat.jabatan).toBe('KEPALA_BKPSDM');
  });

  // CRUD PEJABAT (ADMIN)
  test('POST /api/v1/pejabat-penandatangan - ditolak (400) jika akun belum ber-role pejabat_ttd', async () => {
    const res = await request(app)
      .post('/api/v1/pejabat-penandatangan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: calonSekdaUser.id,
        jabatan: 'SEKDA',
        nama: 'Calon Sekda Test',
        nik: '3201010101650099',
        jenis: 'PARAF',
        urutan: 2
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/pejabat-penandatangan - ditolak (409) jika jabatan sudah diisi pejabat aktif', async () => {
    await prisma.user.update({ where: { id: calonSekdaUser.id }, data: { role: 'pejabat_ttd' } });

    const res = await request(app)
      .post('/api/v1/pejabat-penandatangan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: calonSekdaUser.id,
        jabatan: 'SEKDA',
        nama: 'Calon Sekda Test',
        nik: '3201010101650099',
        jenis: 'PARAF',
        urutan: 2
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/pejabat-penandatangan - boleh jika didaftarkan sebagai nonaktif', async () => {
    const res = await request(app)
      .post('/api/v1/pejabat-penandatangan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: calonSekdaUser.id,
        jabatan: 'SEKDA',
        nama: 'Calon Sekda Test',
        nik: '3201010101650099',
        jenis: 'PARAF',
        urutan: 2,
        isActive: false
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
