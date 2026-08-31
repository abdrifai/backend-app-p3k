import csv from 'csv-parser';
import { Readable } from 'stream';
import crypto from 'crypto';
import { P3kParuhWaktuRepository } from './p3k-paruh-waktu.repository.js';

const ALLOWED_FIELDS = new Set([
  'pnsId', 'nipBaru', 'nipLama', 'nama', 'gelarDepan', 'gelarBelakang',
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
  'unorId', 'unorNama', 'unorInduk', 'instansiIndukId', 'instansiIndukNama',
  'instansiKerjaId', 'instansiKerjaNama', 'satuanKerjaIndukId', 'satuanKerjaIndukNama',
  'satuanKerjaKerjaId', 'satuanKerjaKerjaNama', 'isValidNik', 'namaSekolah',
  'flagIkd', 'eselonId', 'eselonNama'
]);

export class P3kParuhWaktuService {
  /**
   * Process and import CSV file buffer for P3K Paruh Waktu
   */
  static async processCsv(fileBuffer, { replaceAll = true } = {}) {
    return new Promise((resolve, reject) => {
      const results = [];
      const seenNips = new Set();

      // Auto detect separator: |, ;, or ,
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
            // Convert e.g. "PNS ID" -> "pnsId", "NIP BARU" -> "nipBaru", "GOL AWAL ID" -> "golAwalId"
            return key
              .toLowerCase()
              .replace(/[\s_]+([a-z0-9])/g, (g) => g.replace(/[\s_]+/, '').toUpperCase());
          }
        }))
        .on('data', (data) => {
          // Clean NIP, NIK, PNS ID
          if (data.nipBaru) {
            data.nipBaru = String(data.nipBaru).replace(/['`\s]/g, '').trim();
          }
          if (data.nipLama) {
            data.nipLama = String(data.nipLama).replace(/['`\s]/g, '').trim();
          }
          if (data.pnsId) {
            data.pnsId = String(data.pnsId).replace(/['`\s]/g, '').trim();
          }
          if (data.nik) {
            data.nik = String(data.nik).replace(/['`\s]/g, '').trim();
          }

          // Skip empty NIP or duplicates in the same CSV file
          if (!data.nipBaru || !data.nama || seenNips.has(data.nipBaru)) {
            return;
          }
          seenNips.add(data.nipBaru);

          const cleaned = {
            id: crypto.randomUUID()
          };

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
            if (results.length === 0) {
              const err = new Error('File CSV kosong atau tidak memiliki data yang valid dengan header NIP BARU dan NAMA');
              err.statusCode = 400;
              return reject(err);
            }

            if (replaceAll) {
              await P3kParuhWaktuRepository.deleteAll();
              await P3kParuhWaktuRepository.deleteAllMaster();
            }

            const insertedCount = await P3kParuhWaktuRepository.bulkCreate(results);

            // Auto sync to data_p3k_paruh_waktu with auto Unor Induk matching
            await P3kParuhWaktuRepository.syncToDataP3kParuhWaktu(results);

            return resolve({
              totalParsed: results.length,
              importedCount: insertedCount,
              replaced: replaceAll
            });
          } catch (err) {
            return reject(err);
          }
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  /**
   * Sync all records from p3k_paruh_waktu to data_p3k_paruh_waktu
   */
  static async syncAllToMaster() {
    const allRecords = await P3kParuhWaktuRepository.findMany({ page: 1, limit: 100000 });
    const count = await P3kParuhWaktuRepository.syncToDataP3kParuhWaktu(allRecords.data || []);
    return { syncedCount: count };
  }

  /**
   * Get paginated master data from data_p3k_paruh_waktu
   */
  static async getMasterData(params) {
    return P3kParuhWaktuRepository.findMasterMany(params);
  }

  /**
   * Update Unor Induk Mapping for single DataP3kParuhWaktu
   */
  static async updateMasterMappingUnor(id, unorIndukId) {
    return P3kParuhWaktuRepository.updateMasterMappingUnor(id, unorIndukId);
  }

  /**
   * Bulk Update Unor Induk Mapping for DataP3kParuhWaktu
   */
  static async bulkUpdateMasterMappingUnor(ids, unorIndukId) {
    return P3kParuhWaktuRepository.bulkUpdateMasterMappingUnor(ids, unorIndukId);
  }

  /**
   * Get paginated data
   */
  static async getData(params) {
    return P3kParuhWaktuRepository.findMany(params);
  }

  /**
   * Get single profile by ID or NIP
   */
  static async getByIdOrNip(idOrNip) {
    return P3kParuhWaktuRepository.findByIdOrNip(idOrNip);
  }

  /**
   * Get filter options
   */
  static async getFilterOptions() {
    const [unorList, golonganList] = await Promise.all([
      P3kParuhWaktuRepository.getDistinctUnor(),
      P3kParuhWaktuRepository.getDistinctGolongan()
    ]);
    return { unorList, golonganList };
  }

  /**
   * Get summary stats
   */
  static async getStats() {
    return P3kParuhWaktuRepository.getStats();
  }

  /**
   * Clear all imported data
   */
  static async clearAll() {
    await P3kParuhWaktuRepository.deleteAllMaster();
    return P3kParuhWaktuRepository.deleteAll();
  }

  /**
   * Delete single
   */
  static async deleteById(id) {
    return P3kParuhWaktuRepository.deleteById(id);
  }
}

