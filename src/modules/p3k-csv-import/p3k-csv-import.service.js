import csv from 'csv-parser';
import { Readable } from 'stream';
import prisma from '../../config/database.js';
import { P3kCsvImportRepository } from './p3k-csv-import.repository.js';

export class P3kCsvImportService {
  static async processCsv(fileBuffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);

      bufferStream
        .pipe(csv({
          separator: '|',
          mapHeaders: ({ header }) => {
            // Trim whitespace
            let key = header.trim();
            // Convert to camelCase (e.g., "PNS ID" -> "pnsId", "NIP LAMA" -> "nipLama")
            return key
              .toLowerCase()
              .replace(/[\s_]+([a-z])/g, (g) => g.replace(/[\s_]+/, '').toUpperCase());
          }
        }))
        .on('data', (data) => {
          // Menghilangkan tanda petik satu / backtick di NIP_BARU dan NIP_LAMA jika ada
          if (data.nipBaru) {
            data.nipBaru = data.nipBaru.replace(/['`]/g, '');
          }
          if (data.nipLama) {
            data.nipLama = data.nipLama.replace(/['`]/g, '');
          }
          results.push(data);
        })
        .on('end', async () => {
          try {
            console.log('Parsed CSV Results Length:', results.length);
            if (results.length > 0) {
               console.log('Sample data:', results[0]);
            }

            if (results.length === 0) {
              const err = new Error('File CSV kosong atau tidak memiliki data yang valid');
              err.statusCode = 400;
              return reject(err);
            } 

            // Hapus semua data import lama sebelum memasukkan data baru
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
}
