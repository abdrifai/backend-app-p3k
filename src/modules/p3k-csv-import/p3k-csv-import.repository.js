import prisma from '../../config/database.js';

export class P3kCsvImportRepository {
  static async bulkCreate(data) {
    const CHUNK_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      const res = await prisma.p3kCsvImport.createMany({
        data: chunk,
        skipDuplicates: true
      });
      totalInserted += (res.count || 0);
    }

    return { count: totalInserted };
  }

  static async deleteAll() {
    return prisma.p3kCsvImport.deleteMany({});
  }

  static async getLastImportTime() {
    const latest = await prisma.p3kCsvImport.findFirst({
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    return latest?.createdAt || null;
  }

  static _buildWhereClause({ search, unitKerja, tanggalSkCpns }) {
    let where = { AND: [] };

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } }
        ]
      });
    }

    if (unitKerja) {
      where.AND.push({
        OR: [
          { unorNama: { contains: unitKerja } },
          { lokasiKerjaNama: { contains: unitKerja } },
          { instansiKerjaNama: { contains: unitKerja } }
        ]
      });
    }

    if (tanggalSkCpns) {
      where.AND.push({
        tanggalSkCpns: { contains: tanggalSkCpns }
      });
    }

    // Prisma doesn't like an empty AND array if we have no conditions
    if (where.AND.length === 0) {
      return {};
    }
    
    return where;
  }

  static async findAll({ skip, take, search, unitKerja, tanggalSkCpns }) {
    const where = this._buildWhereClause({ search, unitKerja, tanggalSkCpns });

    return prisma.p3kCsvImport.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  static async count({ search, unitKerja, tanggalSkCpns } = {}) {
    const where = this._buildWhereClause({ search, unitKerja, tanggalSkCpns });
    return prisma.p3kCsvImport.count({ where });
  }

  static async groupByField(field) {
    const results = await prisma.p3kCsvImport.groupBy({
      by: [field],
      _count: { [field]: true },
      orderBy: { _count: { [field]: 'desc' } },
      take: 15
    });

    return results.map(r => ({
      label: r[field] || 'Tidak Diketahui',
      count: r._count[field]
    }));
  }

  static async getTotalCount() {
    return prisma.p3kCsvImport.count();
  }

  static async getGenderCount() {
    const results = await prisma.p3kCsvImport.groupBy({
      by: ['jenisKelamin'],
      _count: { jenisKelamin: true }
    });

    let laki = 0;
    let perempuan = 0;
    for (const r of results) {
      const val = (r.jenisKelamin || '').toUpperCase();
      if (val === 'M' || val === 'L' || val === '1' || val.includes('LAKI')) {
        laki += r._count.jenisKelamin;
      } else if (val === 'F' || val === 'P' || val === '2' || val.includes('PEREMPUAN')) {
        perempuan += r._count.jenisKelamin;
      }
    }

    return { laki, perempuan };
  }

  static async findByRetirementYear({ retirementYear, retirementAge = 58, skip, take, search }) {
    const birthYear = String(retirementYear - retirementAge);

    const where = { AND: [] };
    where.AND.push({ tanggalLahir: { endsWith: birthYear } });

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } },
          { unorNama: { contains: search } }
        ]
      });
    }

    return prisma.p3kCsvImport.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        nipBaru: true,
        nama: true,
        gelarDepan: true,
        gelarBelakang: true,
        tanggalLahir: true,
        jenisKelamin: true,
        pendidikanNama: true,
        jabatanNama: true,
        unorNama: true,
        lokasiKerjaNama: true,
        golAkhirNama: true
      },
      orderBy: { nama: 'asc' }
    });
  }

  static async countByRetirementYear({ retirementYear, retirementAge = 58, search }) {
    const birthYear = String(retirementYear - retirementAge);

    const where = { AND: [] };
    where.AND.push({ tanggalLahir: { endsWith: birthYear } });

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } },
          { unorNama: { contains: search } }
        ]
      });
    }

    return prisma.p3kCsvImport.count({ where });
  }

  static async groupRetirementByUnitKerja({ retirementYear, retirementAge = 58 }) {
    const birthYear = String(retirementYear - retirementAge);

    const results = await prisma.p3kCsvImport.groupBy({
      by: ['unorNama'],
      where: { tanggalLahir: { endsWith: birthYear } },
      _count: { unorNama: true },
      orderBy: { _count: { unorNama: 'desc' } },
      take: 20
    });

    return results.map(r => ({
      label: r.unorNama || 'Tidak Diketahui',
      count: r._count.unorNama
    }));
  }

  static async getCompareUnorSummary({ search } = {}) {
    // 1. Ambil seluruh master unit kerja dari ref_unor
    let refUnorWhere = { isDeleted: false };
    if (search) {
      refUnorWhere.nama = { contains: search };
    }

    const refUnors = await prisma.refUnor.findMany({
      where: refUnorWhere,
      select: { id: true, nama: true },
      orderBy: { nama: 'asc' }
    });

    // 2. Agregasi data_p3k (Data Utama - Aktif) yang berelasi dengan ref_unor via unorIndukId
    const utamaCounts = await prisma.$queryRawUnsafe(`
      SELECT 
        ru.id AS unorId,
        COUNT(DISTINCT d.id) AS totalUtama
      FROM ref_unor ru
      LEFT JOIN data_p3k d ON d.unorIndukId = ru.id AND d.isDeleted = false AND d.statusPensiun = 'AKTIF'
      WHERE ru.isDeleted = false
      GROUP BY ru.id
    `);

    // 3. Agregasi p3k_csv_imports (Data Pembanding SIASN) dengan pencocokan nama eksak
    const importCounts = await prisma.$queryRawUnsafe(`
      SELECT 
        ru.id AS unorId,
        COUNT(DISTINCT i.id) AS totalImport
      FROM ref_unor ru
      LEFT JOIN p3k_csv_imports i ON (i.unorInduk = ru.nama OR i.unorNama = ru.nama) AND i.isDeleted = false
      WHERE ru.isDeleted = false
      GROUP BY ru.id
    `);

    const utamaMap = new Map(utamaCounts.map(r => [r.unorId, Number(r.totalUtama || 0)]));
    const importMap = new Map(importCounts.map(r => [r.unorId, Number(r.totalImport || 0)]));

    const summary = refUnors.map(ru => {
      const totalUtama = utamaMap.get(ru.id) || 0;
      const totalImport = importMap.get(ru.id) || 0;
      const selisih = totalImport - totalUtama;
      return {
        unorId: ru.id,
        unorNama: ru.nama,
        totalUtama,
        totalImport,
        selisih,
        status: selisih === 0 ? 'SINKRON' : selisih > 0 ? 'LEBIH_DI_SIASN' : 'LEBIH_DI_UTAMA'
      };
    });

    return summary;
  }

  static async getCompareUnorDetail({ unorIndukId, unitKerja, statusFilter = 'ALL', search = '', skip = 0, take = 50 }) {
    // Cari target RefUnor jika unorIndukId atau unitKerja diberikan
    let targetUnor = null;
    if (unorIndukId) {
      targetUnor = await prisma.refUnor.findFirst({
        where: { id: unorIndukId, isDeleted: false },
        select: { id: true, nama: true }
      });
    } else if (unitKerja) {
      targetUnor = await prisma.refUnor.findFirst({
        where: { nama: unitKerja, isDeleted: false },
        select: { id: true, nama: true }
      });
    }

    const effectiveUnorId = targetUnor?.id || unorIndukId;
    const effectiveUnorNama = targetUnor?.nama || unitKerja;

    // 1. Ambil data pegawai aktif dari data_p3k (Data Utama) berdasarkan unorIndukId
    const dataP3kWhere = {
      isDeleted: false,
      statusPensiun: 'AKTIF'
    };

    if (effectiveUnorId) {
      dataP3kWhere.unorIndukId = effectiveUnorId;
    } else if (effectiveUnorNama) {
      dataP3kWhere.OR = [
        { unorInduk: { nama: effectiveUnorNama } },
        { unorNama: effectiveUnorNama }
      ];
    }

    const utamaList = await prisma.dataP3k.findMany({
      where: dataP3kWhere,
      include: {
        unorInduk: { select: { id: true, nama: true } }
      },
      orderBy: { nama: 'asc' }
    });

    // 2. Ambil data pembanding dari p3k_csv_imports
    // Ambil NIP yang ada di Data Utama
    const utamaNips = utamaList.map(u => u.nipBaru);
    const matchedImports = await prisma.p3kCsvImport.findMany({
      where: {
        nipBaru: { in: utamaNips },
        isDeleted: false
      }
    });

    // Ambil juga pegawai yang ada di import SIASN untuk unit kerja ini tapi belum ada di Data Utama
    const extraImports = await prisma.p3kCsvImport.findMany({
      where: {
        isDeleted: false,
        OR: [
          { unorInduk: effectiveUnorNama },
          { unorNama: effectiveUnorNama }
        ],
        nipBaru: { notIn: utamaNips }
      }
    });

    const importMap = new Map();
    for (const i of [...matchedImports, ...extraImports]) {
      importMap.set(i.nipBaru, i);
    }

    const compared = [];

    // Prioritas 1: Pegawai dari Data Utama (Basis Data)
    for (const u of utamaList) {
      const imp = importMap.get(u.nipBaru);

      let statusSync = 'MATCH';
      if (!imp) {
        statusSync = 'HANYA_UTAMA';
      } else {
        const uUnor = String(u.unorNama || '').trim().toLowerCase();
        const iUnor = String(imp.unorNama || '').trim().toLowerCase();
        if (uUnor && iUnor && uUnor !== iUnor) {
          statusSync = 'BEDA_UNOR';
        } else {
          statusSync = 'MATCH';
        }
      }

      compared.push({
        nipBaru: u.nipBaru,
        namaUtama: u.nama,
        gelarDepanUtama: u.gelarDepan,
        gelarBelakangUtama: u.gelarBelakang,
        unorUtama: u.unorNama || u.unorInduk?.nama || '-',
        jabatanUtama: u.jabatanNama || '-',

        adaDiImport: !!imp,
        namaImport: imp?.nama || null,
        gelarDepanImport: imp?.gelarDepan || null,
        gelarBelakangImport: imp?.gelarBelakang || null,
        unorImport: imp?.unorNama || imp?.unorInduk || null,
        jabatanImport: imp?.jabatanNama || null,

        statusSync
      });
    }

    // Prioritas 2: Pegawai yang ada di SIASN tapi belum masuk Data Utama
    for (const imp of extraImports) {
      compared.push({
        nipBaru: imp.nipBaru,
        namaUtama: null,
        gelarDepanUtama: null,
        gelarBelakangUtama: null,
        unorUtama: null,
        jabatanUtama: null,

        adaDiImport: true,
        namaImport: imp.nama,
        gelarDepanImport: imp.gelarDepan,
        gelarBelakangImport: imp.gelarBelakang,
        unorImport: imp.unorNama || imp.unorInduk || '-',
        jabatanImport: imp.jabatanNama || '-',

        statusSync: 'HANYA_IMPORT'
      });
    }

    const summary = {
      totalPegawai: compared.length,
      totalUtama: utamaList.length,
      totalImport: matchedImports.length + extraImports.length,
      totalMatch: compared.filter(r => r.statusSync === 'MATCH').length,
      totalHanyaUtama: compared.filter(r => r.statusSync === 'HANYA_UTAMA').length,
      totalBedaUnor: compared.filter(r => r.statusSync === 'BEDA_UNOR').length,
      totalHanyaImport: extraImports.length
    };

    let filtered = compared;
    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.statusSync === statusFilter);
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r =>
        (r.nipBaru && r.nipBaru.toLowerCase().includes(s)) ||
        (r.namaUtama && r.namaUtama.toLowerCase().includes(s)) ||
        (r.namaImport && r.namaImport.toLowerCase().includes(s)) ||
        (r.jabatanUtama && r.jabatanUtama.toLowerCase().includes(s)) ||
        (r.jabatanImport && r.jabatanImport.toLowerCase().includes(s))
      );
    }

    const totalFiltered = filtered.length;
    const paginated = filtered.slice(skip, skip + take);

    return {
      summary,
      data: paginated,
      totalFiltered
    };
  }

  /**
   * Sync all records from p3k_csv_imports to data_p3k (Master Full Waktu)
   */
  static async syncToDataP3kMaster(chunkSize = 500) {
    const imports = await prisma.p3kCsvImport.findMany({
      where: { isDeleted: false }
    });

    let syncedCount = 0;

    for (let i = 0; i < imports.length; i += chunkSize) {
      const chunk = imports.slice(i, i + chunkSize);
      const masterRecords = chunk.map(r => ({
        id: r.id,
        pnsId: r.pnsId || r.nipBaru,
        nipBaru: r.nipBaru,
        nipLama: r.nipLama || null,
        nama: r.nama,
        gelarDepan: r.gelarDepan || null,
        gelarBelakang: r.gelarBelakang || null,
        tempatLahirId: r.tempatLahirId || null,
        tempatLahirNama: r.tempatLahirNama || null,
        tanggalLahir: r.tanggalLahir || null,
        jenisKelamin: r.jenisKelamin || null,
        agamaId: r.agamaId || null,
        agamaNama: r.agamaNama || null,
        jenisKawinId: r.jenisKawinId || null,
        jenisKawinNama: r.jenisKawinNama || null,
        nik: r.nik || null,
        nomorHp: r.nomorHp || null,
        email: r.email || null,
        emailGov: r.emailGov || null,
        alamat: r.alamat || null,
        npwpNomor: r.npwpNomor || null,
        bpjs: r.bpjs || null,
        jenisPegawaiId: r.jenisPegawaiId || null,
        jenisPegawaiNama: r.jenisPegawaiNama || null,
        kedudukanHukumId: r.kedudukanHukumId || null,
        kedudukanHukumNama: r.kedudukanHukumNama || null,
        statusCpnsPns: r.statusCpnsPns || null,
        kartuAsnVirtual: r.kartuAsnVirtual || null,
        nomorSkCpns: r.nomorSkCpns || null,
        tanggalSkCpns: r.tanggalSkCpns || null,
        tmtCpns: r.tmtCpns || null,
        nomorSkPns: r.nomorSkPns || null,
        tanggalSkPns: r.tanggalSkPns || null,
        tmtPns: r.tmtPns || null,
        golAwalId: r.golAwalId || null,
        golAwalNama: r.golAwalNama || null,
        golAkhirId: r.golAkhirId || null,
        golAkhirNama: r.golAkhirNama || null,
        tmtGolongan: r.tmtGolongan || null,
        mkTahun: r.mkTahun || null,
        mkBulan: r.mkBulan || null,
        jenisJabatanId: r.jenisJabatanId || null,
        jenisJabatanNama: r.jenisJabatanNama || null,
        jabatanId: r.jabatanId || null,
        jabatanNama: r.jabatanNama || null,
        tmtJabatan: r.tmtJabatan || null,
        tingkatPendidikanId: r.tingkatPendidikanId || null,
        tingkatPendidikanNama: r.tingkatPendidikanNama || null,
        pendidikanId: r.pendidikanId || null,
        pendidikanNama: r.pendidikanNama || null,
        tahunLulus: r.tahunLulus || null,
        kpknId: r.kpknId || null,
        kpknNama: r.kpknNama || null,
        lokasiKerjaId: r.lokasiKerjaId || null,
        lokasiKerjaNama: r.lokasiKerjaNama || null,
        unorId: r.unorId || null,
        unorNama: r.unorNama || null,
        unorIndukId: null, // manual mapping only
        instansiIndukId: r.instansiIndukId || null,
        instansiIndukNama: r.instansiIndukNama || null,
        instansiKerjaId: r.instansiKerjaId || null,
        instansiKerjaNama: r.instansiKerjaNama || null,
        satuanKerjaIndukId: r.satuanKerjaIndukId || null,
        satuanKerjaIndukNama: r.satuanKerjaIndukNama || null,
        satuanKerjaKerjaId: r.satuanKerjaKerjaId || null,
        satuanKerjaKerjaNama: r.satuanKerjaKerjaNama || null,
        isValidNik: r.isValidNik || null,
        namaSekolah: r.namaSekolah || null,
        flagIkd: r.flagIkd || null,
        statusPensiun: 'AKTIF',
        isDeleted: false
      }));

      const res = await prisma.dataP3k.createMany({
        data: masterRecords,
        skipDuplicates: true
      });
      syncedCount += (res.count || 0);
    }

    return { totalParsed: imports.length, syncedCount };
  }
}

