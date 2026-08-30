import csv from 'csv-parser';
import { Readable } from 'stream';
import prisma from '../../config/database.js';
import { P3kCsvImportRepository } from './p3k-csv-import.repository.js';

const ALLOWED_FIELDS = new Set([
  'nipLama', 'nipBaru', 'pnsId', 'nama', 'gelarDepan', 'gelarBelakang',
  'tempatLahirId', 'tempatLahirNama', 'tanggalLahir', 'jenisKelamin',
  'agamaId', 'agamaNama', 'jenisKawinId', 'jenisKawinNama', 'nik',
  'nomorHp', 'email', 'emailGov', 'alamat', 'npwpNomor', 'bpjs',
  'jenisPegawaiId', 'jenisPegawaiNama', 'kedudukanHukumId', 'kedudukanHukumNama',
  'statusCpnsPns', 'kartuAsnVirtual', 'nomorSkCpns', 'tanggalSkCpns', 'tmtCpns',
  'nomorSkPns', 'tanggalSkPns', 'tmtPns', 'golAwalId', 'golAwalNama',
  'golAkhirId', 'golAkhirNama', 'tmtGolongan', 'mkTahun', 'mkBulan',
  'jenisJabatanId', 'jenisJabatanNama', 'jabatanId', 'jabatanNama', 'tmtJabatan',
  'tingkatPendidikanId', 'tingkatPendidikanNama', 'pendidikanId', 'pendidikanNama',
  'tahunLulus', 'kpknId', 'kpknNama', 'lokasiKerjaId', 'lokasiKerjaNama',
  'unorId', 'unorNama', 'instansiIndukId', 'instansiIndukNama',
  'instansiKerjaId', 'instansiKerjaNama', 'satuanKerjaIndukId', 'satuanKerjaIndukNama',
  'satuanKerjaKerjaId', 'satuanKerjaKerjaNama', 'isValidNik', 'namaSekolah',
  'flagIkd', 'unorInduk'
]);

export class P3kCsvImportService {
  static async processCsv(fileBuffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const seenNips = new Set();

      // Auto detect separator
      const sampleText = fileBuffer.slice(0, 4096).toString('utf-8');
      const firstLine = sampleText.split(/\r?\n/)[0] || '';
      let separator = '|';
      if (firstLine.includes('|')) {
        separator = '|';
      } else if (firstLine.includes(';')) {
        separator = ';';
      } else if (firstLine.includes(',')) {
        separator = ',';
      }

      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);

      bufferStream
        .pipe(csv({
          separator,
          mapHeaders: ({ header }) => {
            let key = header.trim();
            // Convert to camelCase (e.g., "PNS ID" -> "pnsId", "NIP LAMA" -> "nipLama")
            return key
              .toLowerCase()
              .replace(/[\s_]+([a-z])/g, (g) => g.replace(/[\s_]+/, '').toUpperCase());
          }
        }))
        .on('data', (data) => {
          // Bersihkan NIP & NIK
          if (data.nipBaru) {
            data.nipBaru = String(data.nipBaru).replace(/['`\s]/g, '').trim();
          }
          if (data.nipLama) {
            data.nipLama = String(data.nipLama).replace(/['`\s]/g, '').trim();
          }
          if (data.pnsId) {
            data.pnsId = String(data.pnsId).replace(/['`\s]/g, '').trim();
          }

          // Skip baris tanpa NIP atau NIP duplikat di file yang sama
          if (!data.nipBaru || !data.nama || seenNips.has(data.nipBaru)) {
            return;
          }
          seenNips.add(data.nipBaru);

          // Filter hanya field yang valid sesuai schema Prisma
          const cleaned = {};
          for (const key of Object.keys(data)) {
            if (ALLOWED_FIELDS.has(key)) {
              cleaned[key] = data[key] ? String(data[key]).trim() : null;
            }
          }

          if (cleaned.nipBaru) {
            results.push(cleaned);
          }
        })
        .on('end', async () => {
          try {
            console.log('Parsed CSV Results Count:', results.length);

            if (results.length === 0) {
              const err = new Error('File CSV kosong atau tidak memiliki data yang valid');
              err.statusCode = 400;
              return reject(err);
            } 

            // Hapus data import sebelumnya sebelum memasukkan yang baru
            await P3kCsvImportRepository.deleteAll();

            const inserted = await P3kCsvImportRepository.bulkCreate(results);
            console.log('Insertion Result:', inserted);
            resolve(inserted);
          } catch (error) {
            console.error('Prisma Insertion Error:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('CSV Parse Error:', error);
          error.statusCode = 400;
          reject(error);
        });
    });
  }

  static async getAllP3kData({ page, limit, search, unitKerja, tanggalSkCpns }) {
    const skip = (page - 1) * limit;
    
    const [data, totalCount] = await Promise.all([
      P3kCsvImportRepository.findAll({ skip, take: limit, search, unitKerja, tanggalSkCpns }),
      P3kCsvImportRepository.count({ search, unitKerja, tanggalSkCpns })
    ]);

    // Tandai mana yang sudah ada di database utama
    const nips = data.map(d => d.nipBaru);
    const existingP3ks = await prisma.dataP3k.findMany({
      where: { nipBaru: { in: nips }, isDeleted: false },
      select: { nipBaru: true }
    });
    const syncedNipSet = new Set(existingP3ks.map(p => p.nipBaru));

    const enrichedData = data.map(d => ({
      ...d,
      isSynced: syncedNipSet.has(d.nipBaru)
    }));

    return {
      data: enrichedData,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  static async getStatistics() {
    const [
      totalPegawai,
      genderCount,
      byPendidikan,
      byUnitKerja,
      byJenisJabatan,
      byGolongan
    ] = await Promise.all([
      P3kCsvImportRepository.getTotalCount(),
      P3kCsvImportRepository.getGenderCount(),
      P3kCsvImportRepository.groupByField('pendidikanNama'),
      P3kCsvImportRepository.groupByField('unorNama'),
      P3kCsvImportRepository.groupByField('jenisJabatanNama'),
      P3kCsvImportRepository.groupByField('golAkhirNama')
    ]);

    return {
      totalPegawai,
      genderCount,
      byPendidikan,
      byUnitKerja,
      byJenisJabatan,
      byGolongan
    };
  }

  static async getRetirementReport({ year, page = 1, limit = 10, search = '' }) {
    const retirementAge = 58;
    const skip = (page - 1) * limit;

    const [data, totalCount, byUnitKerja] = await Promise.all([
      P3kCsvImportRepository.findByRetirementYear({
        retirementYear: year,
        retirementAge,
        skip,
        take: limit,
        search
      }),
      P3kCsvImportRepository.countByRetirementYear({
        retirementYear: year,
        retirementAge,
        search
      }),
      P3kCsvImportRepository.groupRetirementByUnitKerja({
        retirementYear: year,
        retirementAge
      })
    ]);

    return {
      data,
      byUnitKerja,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        year,
        retirementAge,
        birthYear: year - retirementAge
      }
    };
  }

  static async getLastImportTime() {
    return P3kCsvImportRepository.getLastImportTime();
  }

  static async getCompareUnorSummary({ search = '' } = {}) {
    return P3kCsvImportRepository.getCompareUnorSummary({ search });
  }

  static async getCompareUnorDetail({ unitKerja, statusFilter = 'ALL', search = '', page = 1, limit = 50 }) {
    if (!unitKerja) {
      const err = new Error('Nama unit kerja wajib diisi');
      err.statusCode = 400;
      throw err;
    }

    const skip = (page - 1) * limit;
    const { summary, data, totalFiltered } = await P3kCsvImportRepository.getCompareUnorDetail({
      unitKerja,
      statusFilter,
      search,
      skip,
      take: limit
    });

    return {
      summary,
      data,
      meta: {
        total: totalFiltered,
        page,
        limit,
        totalPages: Math.ceil(totalFiltered / limit) || 1
      }
    };
  }
}
