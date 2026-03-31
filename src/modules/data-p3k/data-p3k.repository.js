import prisma from '../../config/database.js';

export class DataP3kRepository {
  static async syncFromImport() {
    // We can use Prisma raw query for better performance on large datasets,
    // but Prisma's `findMany` + `createMany` with `skipDuplicates: true` is also safe.
    
    // Find all nipBarus currently imported
    const importData = await prisma.p3kCsvImport.findMany({
      where: { isDeleted: false }
    });

    if (importData.length === 0) {
      return 0;
    }

    // Get existing NIPs in DataP3k to avoid inserting them
    const existingP3ks = await prisma.dataP3k.findMany({
      select: { nipBaru: true }
    });
    const existingNipSet = new Set(existingP3ks.map((p) => p.nipBaru));

    const dataToInsert = [];
    for (const item of importData) {
      if (!existingNipSet.has(item.nipBaru)) {
        // Strip out fields we don't want to copy over directly (like id)
        // Also strip unorInduk because in DataP3k it's a relation (unorIndukId), while in import it's a string
        const { id, createdAt, updatedAt, unorInduk, ...rest } = item;
        dataToInsert.push({ ...rest, statusPensiun: 'AKTIF', isDeleted: false });
      }
    }

    if (dataToInsert.length === 0) {
      return 0; // Everything is already synced
    }

    // Insert new data
    const result = await prisma.dataP3k.createMany({
      data: dataToInsert,
      skipDuplicates: true, // Double safety
    });

    return result.count;
  }

  static _buildWhereClause({ search, unitKerja, unitKerjaKosong, unitKerjaAda, statusPensiun, tmtCpns, pendidikan, golongan, jenisJabatan }) {
    let where = { AND: [{ isDeleted: false }] };

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } }
        ]
      });
    }

    if (unitKerjaKosong === true || unitKerjaKosong === 'true') {
      where.AND.push({
        unorIndukId: null
      });
    } else if (unitKerjaAda === true || unitKerjaAda === 'true') {
      where.AND.push({
        unorIndukId: { not: null }
      });
    }

    if (unitKerja) {
      where.AND.push({
        unorInduk: {
          nama: { contains: unitKerja }
        }
      });
    }

    if (statusPensiun) {
      if (search && statusPensiun === 'AKTIF') {
        // If searching, we allow both AKTIF and PENSIUN for better UX
        where.AND.push({
          statusPensiun: { in: ['AKTIF', 'PENSIUN'] }
        });
      } else {
        where.AND.push({ statusPensiun });
      }
    }

    if (tmtCpns) {
      where.AND.push({ tmtCpns: { contains: tmtCpns } });
    }

    if (pendidikan) {
      where.AND.push({ tingkatPendidikanNama: pendidikan });
    }

    if (golongan) {
      where.AND.push({ golAkhirNama: golongan });
    }

    if (jenisJabatan) {
      where.AND.push({ jenisJabatanNama: jenisJabatan });
    }

    if (where.AND.length === 0) {
      return {};
    }
    
    return where;
  }

  static async findAll({ skip, take, search, unitKerja, unitKerjaKosong, unitKerjaAda, statusPensiun, tmtCpns, pendidikan, golongan, jenisJabatan }) {
    const where = this._buildWhereClause({ search, unitKerja, unitKerjaKosong, unitKerjaAda, statusPensiun, tmtCpns, pendidikan, golongan, jenisJabatan });

    return prisma.dataP3k.findMany({
      where,
      skip,
      take,
      include: {
        unorInduk: true,
        arsipSkPensiun: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  static async count({ search, unitKerja, unitKerjaKosong, unitKerjaAda, statusPensiun, tmtCpns, pendidikan, golongan, jenisJabatan } = {}) {
    const where = this._buildWhereClause({ search, unitKerja, unitKerjaKosong, unitKerjaAda, statusPensiun, tmtCpns, pendidikan, golongan, jenisJabatan });
    return prisma.dataP3k.count({ where });
  }

  static async groupByField(field, additionalWhere = {}, orderBy = null) {
    const results = await prisma.dataP3k.groupBy({
      by: [field],
      where: { isDeleted: false, ...additionalWhere },
      _count: { [field]: true },
      orderBy: orderBy || { _count: { [field]: 'desc' } }
    });

    return results.map((r) => ({
      label: r[field] || 'Tidak Diketahui',
      count: r._count[field]
    }));
  }

  static async groupByUnorInduk(additionalWhere = {}) {
    const results = await prisma.dataP3k.groupBy({
      by: ['unorIndukId'],
      where: { isDeleted: false, ...additionalWhere },
      _count: { nipBaru: true },
      orderBy: { _count: { nipBaru: 'desc' } }
    });

    const enrichedResults = await Promise.all(
      results.map(async (r) => {
        let label = 'Kosong / Belum Diset';
        if (r.unorIndukId) {
          const ref = await prisma.refUnor.findUnique({
            where: { id: r.unorIndukId },
            select: { nama: true }
          });
          if (ref) label = ref.nama;
        }
        return {
          label,
          count: r._count.nipBaru
        };
      })
    );

    return enrichedResults;
  }

  static async getTmtPengangkatanStats(additionalWhere = {}) {
    const results = await prisma.dataP3k.groupBy({
      by: ['tmtCpns'],
      where: { isDeleted: false, ...additionalWhere, tmtCpns: { not: null, not: '' } },
      _count: { tmtCpns: true }
    });

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const grouped = {};
    for (const r of results) {
      if (!r.tmtCpns) continue;
      const parts = r.tmtCpns.split('-');
      // format should be DD-MM-YYYY
      if (parts.length === 3) {
        let yy = parts[2];
        let mm = parts[1];
        // Handle variations just in case (e.g. YYYY-MM-DD instead of DD-MM-YYYY)
        if (parts[0].length === 4) {
          yy = parts[0];
          mm = parts[1];
        }
        
        const monthIndex = parseInt(mm, 10) - 1;
        if (monthIndex < 0 || monthIndex > 11) continue;

        const label = `TMT ${monthNames[monthIndex]} ${yy}`;
        // sortKey format: YYYYMM (e.g. 202102)
        const sortKey = parseInt(`${yy}${String(mm).padStart(2, '0')}`, 10);

        const filterValue = `${String(mm).padStart(2, '0')}-${yy}`;

        if (!grouped[sortKey]) {
          grouped[sortKey] = { label, count: 0, sortKey, filterValue, __sourceKeys: [] };
        }
        grouped[sortKey].count += r._count.tmtCpns;
        // Keep track of the actual source dates to pass back for filtering
        grouped[sortKey].__sourceKeys.push(r.tmtCpns);
      }
    }

    // Sort chronologically ascending
    const sorted = Object.values(grouped).sort((a, b) => a.sortKey - b.sortKey);
    
    // Map to expected format
    return sorted.map((g) => ({
      label: g.label,
      filterValue: g.filterValue,
      count: g.count,
      filterKeys: g.__sourceKeys // optional for strictly accurate UI filtering
    }));
  }

  static async getTotalCount(additionalWhere = {}) {
    return prisma.dataP3k.count({
      where: { isDeleted: false, ...additionalWhere }
    });
  }

  static async getGenderCount(additionalWhere = {}) {
    const results = await prisma.dataP3k.groupBy({
      by: ['jenisKelamin'],
      where: { isDeleted: false, ...additionalWhere },
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

    const where = { AND: [{ isDeleted: false }, { statusPensiun: 'AKTIF' }] };
    where.AND.push({ tanggalLahir: { endsWith: birthYear } });

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } },
          { unorNama: { contains: search } },
          { unorInduk: { nama: { contains: search } } }
        ]
      });
    }

    return prisma.dataP3k.findMany({
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
        golAkhirNama: true,
        statusPensiun: true,
        unorInduk: { select: { nama: true } }
      },
      orderBy: { nama: 'asc' }
    });
  }

  static async countByRetirementYear({ retirementYear, retirementAge = 58, search }) {
    const birthYear = String(retirementYear - retirementAge);

    const where = { AND: [{ isDeleted: false }, { statusPensiun: 'AKTIF' }] };
    where.AND.push({ tanggalLahir: { endsWith: birthYear } });

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } },
          { unorNama: { contains: search } },
          { unorInduk: { nama: { contains: search } } }
        ]
      });
    }

    return prisma.dataP3k.count({ where });
  }

  static async groupRetirementByUnitKerja({ retirementYear, retirementAge = 58 }) {
    const birthYear = String(retirementYear - retirementAge);

    const results = await prisma.dataP3k.groupBy({
      by: ['unorIndukId'],
      where: { 
        isDeleted: false,
        statusPensiun: 'AKTIF',
        tanggalLahir: { endsWith: birthYear } 
      },
      _count: { nipBaru: true },
      orderBy: { _count: { nipBaru: 'desc' } },
      take: 20
    });

    const enrichedResults = await Promise.all(
      results.map(async (r) => {
        let label = 'Kosong / Belum Diset';
        if (r.unorIndukId) {
          const ref = await prisma.refUnor.findUnique({
            where: { id: r.unorIndukId },
            select: { nama: true }
          });
          if (ref) label = ref.nama;
        }
        return {
          label,
          count: r._count.nipBaru
        };
      })
    );

    return enrichedResults;
  }

  static async getRetirementProjection({ startYear, count = 5, retirementAge = 58 }) {
    const projections = [];
    for (let i = 0; i < count; i++) {
      const year = startYear + i;
      const birthYear = String(year - retirementAge);
      const c = await prisma.dataP3k.count({
        where: {
          isDeleted: false,
          statusPensiun: 'AKTIF',
          tanggalLahir: { endsWith: birthYear }
        }
      });
      projections.push({ year, count: c });
    }
    return projections;
  }
  static async getDifferences({ skip, take, search }) {
    // Escape search string for safety if provided
    const safeSearch = search ? `%${search}%` : null;

    let query = `
      SELECT 
        u.nipBaru as nip,
        u.nama as namaUtama,
        u.unorNama as unorUtama,
        i.nama as namaImport,
        i.unorNama as unorImport,
        CASE 
          WHEN i.nipBaru IS NULL THEN 'Tidak Ada di Import'
          WHEN u.nama != i.nama OR u.unorNama != i.unorNama THEN 'Data Berbeda'
          ELSE 'Error'
        END as statusPerbedaan
      FROM data_p3k u
      LEFT JOIN p3k_csv_imports i ON u.nipBaru = i.nipBaru
      WHERE u.statusPensiun = 'AKTIF'
        AND (i.nipBaru IS NULL OR u.nama != i.nama OR u.unorNama != i.unorNama)
      
      UNION ALL
      
      SELECT 
        i.nipBaru as nip,
        u.nama as namaUtama,
        u.unorNama as unorUtama,
        i.nama as namaImport,
        i.unorNama as unorImport,
        'Baru di Import' as statusPerbedaan
      FROM p3k_csv_imports i
      LEFT JOIN data_p3k u ON i.nipBaru = u.nipBaru
      WHERE u.nipBaru IS NULL
    `;

    // Fetch all differences into memory. If we have a search param, filter in memory.
    // In production with huge datasets, we'd add where clauses directly to the raw queries, 
    // but Prisma raw queries with conditional logic are complex, and the set of differences is usually small.
    const results = await prisma.$queryRawUnsafe(query);

    // Apply simple search filter in memory
    let filtered = results;
    if (search) {
      const s = search.toLowerCase();
      filtered = results.filter(row => 
        (row.nip && row.nip.toLowerCase().includes(s)) ||
        (row.namaUtama && row.namaUtama.toLowerCase().includes(s)) ||
        (row.namaImport && row.namaImport.toLowerCase().includes(s)) ||
        (row.unorUtama && row.unorUtama.toLowerCase().includes(s)) ||
        (row.unorImport && row.unorImport.toLowerCase().includes(s))
      );
    }

    // Apply pagination
    const paginated = filtered.slice(skip, skip + take);

    return {
      data: paginated,
      totalCount: filtered.length
    };
  }

  static async findByNipBaru(nipBaru) {
    return prisma.dataP3k.findUnique({
      where: { nipBaru, isDeleted: false },
      include: { arsipSkPensiun: true }
    });
  }

  static async setPension({ nipBaru, nomorSk, tanggalSk, fileUrl }) {
    return prisma.$transaction(async (tx) => {
      // 1. Create ArsipSkPensiun
      const arsipSk = await tx.arsipSkPensiun.create({
        data: {
          nomorSk,
          tanggalSk,
          fileUrl
        }
      });

      // 2. Update DataP3k status and link to ArsipSkPensiun
      return await tx.dataP3k.update({
        where: { nipBaru },
        data: {
          statusPensiun: 'PENSIUN',
          arsipSkPensiunId: arsipSk.id
        },
        include: { arsipSkPensiun: true }
      });
    });
  }

  static async findAllPensioned({ skip, take, search }) {
    const where = { AND: [{ isDeleted: false }, { statusPensiun: 'PENSIUN' }] };

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } },
          { unorNama: { contains: search } }
        ]
      });
    }

    const [data, total] = await Promise.all([
      prisma.dataP3k.findMany({
        where,
        skip,
        take,
        include: { arsipSkPensiun: true },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.dataP3k.count({ where })
    ]);

    return { data, total };
  }

  static async updatePension({ nipBaru, nomorSk, tanggalSk, fileUrl }) {
    return prisma.$transaction(async (tx) => {
      const p3k = await tx.dataP3k.findUnique({
        where: { nipBaru },
        select: { arsipSkPensiunId: true }
      });

      if (!p3k || !p3k.arsipSkPensiunId) {
        throw new Error('Data arsip SK tidak ditemukan');
      }

      const updateData = {};
      if (nomorSk) updateData.nomorSk = nomorSk;
      if (tanggalSk) updateData.tanggalSk = tanggalSk;
      if (fileUrl) updateData.fileUrl = fileUrl;

      await tx.arsipSkPensiun.update({
        where: { id: p3k.arsipSkPensiunId },
        data: updateData
      });

      return tx.dataP3k.findUnique({
        where: { nipBaru },
        include: { arsipSkPensiun: true }
      });
    });
  }

  static async revertPension(nipBaru) {
    return prisma.$transaction(async (tx) => {
      const p3k = await tx.dataP3k.findUnique({
        where: { nipBaru },
        select: { arsipSkPensiunId: true }
      });

      // Unlink from ArsipSkPensiun and set back to AKTIF
      const updated = await tx.dataP3k.update({
        where: { nipBaru },
        data: {
          statusPensiun: 'AKTIF',
          arsipSkPensiunId: null
        }
      });

      // Soft delete the ArsipSkPensiun record
      if (p3k?.arsipSkPensiunId) {
        await tx.arsipSkPensiun.update({
          where: { id: p3k.arsipSkPensiunId },
          data: { isDeleted: true }
        });
      }

      return updated;
    });
  }

  static async patchData(nipBaru, payload) {
    return prisma.dataP3k.update({
      where: { nipBaru },
      data: payload
    });
  }
}
