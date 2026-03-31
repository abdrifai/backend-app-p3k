import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import fs from 'fs';
import path from 'path';

describe('P3K CSV Import Integration Tests', () => {
  const testCsvPath = path.join(process.cwd(), 'tests', 'integration', 'dummy.csv');

  beforeAll(async () => {
    // Buat file CSV dummy dengan format header berspasi dan delimiter |
    const csvContent = `NIP LAMA|NIP BARU|PNS ID|NAMA|GELAR DEPAN|GELAR BELAKANG\n123456|\`199001012020011001|A1B2C3|John Doe|Dr.|S.Kom`;
    fs.writeFileSync(testCsvPath, csvContent);
  });

  afterAll(async () => {
    // Hapus file CSV dummy
    if (fs.existsSync(testCsvPath)) fs.unlinkSync(testCsvPath);
    // Bersihkan database
    await prisma.p3kCsvImport.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/p3k-csv-import', () => {
    it('should successfully import valid CSV file', async () => {
      const response = await request(app)
        .post('/api/v1/p3k-csv-import')
        .attach('file', testCsvPath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.importedCount).toBeDefined();

      // Pastikan data tersimpan
      const savedUser = await prisma.p3kCsvImport.findUnique({
        where: { nipBaru: '199001012020011001' }
      });
      expect(savedUser).not.toBeNull();
      expect(savedUser.nama).toBe('John Doe');
    });

    it('should return 400 if no file uploaded', async () => {
      const response = await request(app)
        .post('/api/v1/p3k-csv-import');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if file format is invalid', async () => {
      const invalidFilePath = path.join(process.cwd(), 'tests', 'integration', 'dummy.txt');
      fs.writeFileSync(invalidFilePath, "Not a CSV");

      const response = await request(app)
        .post('/api/v1/p3k-csv-import')
        .attach('file', invalidFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      if (fs.existsSync(invalidFilePath)) fs.unlinkSync(invalidFilePath);
    });
  });
});
