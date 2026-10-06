import request from 'supertest';
import app from '../../src/app.js';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Portal Pegawai Endpoints (/api/v1/portal)', () => {
  let dummyPenuh;
  let dummyUserPegawai;
  let pegawaiToken;
  let adminToken;
  let dummyKontrak;

  beforeAll(async () => {
    // 1. Buat DataP3k
    dummyPenuh = await prisma.dataP3k.create({
      data: {
        nipBaru: '199201012024211005',
        pnsId: 'PNS-TEST-ME-01',
        nama: 'Budi Santoso',
        gelarDepan: 'dr.',
        gelarBelakang: 'Sp.A',
        nik: '7205010101920005',
        tanggalLahir: '1992-01-01',
        statusPensiun: 'AKTIF',
        nomorSkCpns: '800/001/BKPSDM',
        tanggalSkCpns: '2024-03-01',
        tmtCpns: '2024-03-01',
        email: 'budi.santoso@test.id',
        nomorHp: '081122334455'
      }
    });

    // 2. Buat Kontrak
    dummyKontrak = await prisma.riwayatKontrak.create({
      data: {
        dataP3kId: dummyPenuh.id,
        kontrakKe: 1,
        nomorKontrak: '001/P3K/2024',
        tanggalMulai: '2024-03-01',
        tanggalSelesai: '2029-02-28',
        golongan: 'X',
        mkTahun: 0,
        mkBulan: 0
      }
    });

    // 3. Buat User Pegawai
    dummyUserPegawai = await prisma.user.create({
      data: {
        username: '199201012024211005',
        email: 'budi.santoso@test.id',
        password: 'hashedpassword',
        namaLengkap: 'dr. Budi Santoso, Sp.A',
        role: 'pegawai',
        jenisPegawaiPortal: 'PENUH_WAKTU',
        dataP3kId: dummyPenuh.id
      }
    });

    pegawaiToken = jwt.sign(
      {
        id: dummyUserPegawai.id,
        username: dummyUserPegawai.username,
        role: 'pegawai',
        roles: ['pegawai'],
        dataP3kId: dummyPenuh.id
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    // 4. Buat User Admin nyata
    const dummyAdmin = await prisma.user.create({
      data: {
        username: 'admin_portal_test',
        email: 'admin_portal@test.id',
        password: 'hashedpassword',
        namaLengkap: 'Admin Test',
        role: 'admin'
      }
    });

    adminToken = jwt.sign(
      { id: dummyAdmin.id, username: dummyAdmin.username, role: 'admin', roles: ['admin'] },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.riwayatKontrak.deleteMany({
      where: { id: dummyKontrak?.id }
    });
    await prisma.user.deleteMany({
      where: { username: { in: ['199201012024211005', 'admin_portal_test'] } }
    });
    await prisma.dataP3k.deleteMany({
      where: { id: dummyPenuh?.id }
    });
    await prisma.$disconnect();
  });

  it('GET /api/v1/portal/me harus mengembalikan data pegawai yang sedang login', async () => {
    const res = await request(app)
      .get('/api/v1/portal/me')
      .set('Authorization', `Bearer ${pegawaiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nipBaru).toBe('199201012024211005');
    expect(res.body.data.nama).toBe('Budi Santoso');
    expect(res.body.data.jenisPegawaiPortal).toBe('PENUH_WAKTU');
  });

  it('GET /api/v1/portal/me/riwayat-kontrak harus mengembalikan riwayat kontrak milik pegawai', async () => {
    const res = await request(app)
      .get('/api/v1/portal/me/riwayat-kontrak')
      .set('Authorization', `Bearer ${pegawaiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].nomorKontrak).toBe('001/P3K/2024');
  });

  it('GET /api/v1/portal/me/sk-pengangkatan harus mengembalikan info SK pengangkatan pertama', async () => {
    const res = await request(app)
      .get('/api/v1/portal/me/sk-pengangkatan')
      .set('Authorization', `Bearer ${pegawaiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nomorSkCpns).toBe('800/001/BKPSDM');
  });

  it('harus menolak role non-pegawai (admin) saat mengakses /api/v1/portal/me (403)', async () => {
    const res = await request(app)
      .get('/api/v1/portal/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
