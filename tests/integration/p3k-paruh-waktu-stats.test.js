import { P3kParuhWaktuService } from '../../src/modules/p3k-paruh-waktu/p3k-paruh-waktu.service.js';
import prisma from '../../src/config/database.js';

describe('P3K Paruh Waktu Statistics Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return valid statistics structure for master data', async () => {
    const stats = await P3kParuhWaktuService.getStats({ source: 'master' });

    expect(stats).toBeDefined();
    expect(typeof stats.total).toBe('number');
    expect(stats.summary).toBeDefined();
    expect(typeof stats.summary.aktif).toBe('number');
    expect(typeof stats.summary.laki).toBe('number');
    expect(typeof stats.summary.perempuan).toBe('number');
    expect(typeof stats.summary.avgAge).toBe('number');

    expect(Array.isArray(stats.byPendidikan)).toBe(true);
    expect(Array.isArray(stats.byJabatan)).toBe(true);
    expect(Array.isArray(stats.byJenisJabatan)).toBe(true);
    expect(Array.isArray(stats.byUnor)).toBe(true);
    expect(Array.isArray(stats.byAgeRange)).toBe(true);
    expect(Array.isArray(stats.byLokasiKerja)).toBe(true);
    expect(Array.isArray(stats.byPengangkatan)).toBe(true);
  });
});
