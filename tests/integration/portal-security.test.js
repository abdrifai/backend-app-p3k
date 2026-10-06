import request from 'supertest';
import app from '../../src/app.js';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Portal Security & staffGuard Tests', () => {
  let pegawaiUser;
  let pegawaiToken;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // Create dummy pegawai
    pegawaiUser = await prisma.user.upsert({
      where: { username: 'test_pegawai_security' },
      update: { role: 'pegawai', isDeleted: false },
      create: {
        username: 'test_pegawai_security',
        email: 'pegawai_sec@example.com',
        password: 'hashedpassword',
        namaLengkap: 'Pegawai Security Test',
        role: 'pegawai'
      }
    });

    pegawaiToken = jwt.sign(
      { id: pegawaiUser.id, username: pegawaiUser.username, role: 'pegawai', roles: ['pegawai'] },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    // Create dummy admin
    adminUser = await prisma.user.upsert({
      where: { username: 'test_admin_security' },
      update: { role: 'admin', isDeleted: false },
      create: {
        username: 'test_admin_security',
        email: 'admin_sec@example.com',
        password: 'hashedpassword',
        namaLengkap: 'Admin Security Test',
        role: 'admin'
      }
    });

    adminToken = jwt.sign(
      { id: adminUser.id, username: adminUser.username, role: 'admin', roles: ['admin'] },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { username: { in: ['test_pegawai_security', 'test_admin_security'] } }
    });
    await prisma.$disconnect();
  });

  it('harus menolak role pegawai (403) saat mengakses /api/v1/data-p3k', async () => {
    const res = await request(app)
      .get('/api/v1/data-p3k')
      .set('Authorization', `Bearer ${pegawaiToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('harus menolak role pegawai (403) saat mengakses /api/v1/perpanjangan', async () => {
    const res = await request(app)
      .get('/api/v1/perpanjangan')
      .set('Authorization', `Bearer ${pegawaiToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('harus menolak role pegawai (403) saat mengakses /api/v1/kontrak', async () => {
    const res = await request(app)
      .get('/api/v1/kontrak')
      .set('Authorization', `Bearer ${pegawaiToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('harus mengizinkan admin mengakses /api/v1/data-p3k', async () => {
    const res = await request(app)
      .get('/api/v1/data-p3k?limit=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
