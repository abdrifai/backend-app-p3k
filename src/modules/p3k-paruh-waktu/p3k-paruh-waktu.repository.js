import prisma from '../../config/database.js';

export class P3kParuhWaktuRepository {
  /**
   * Bulk create / upsert P3K Paruh Waktu records in chunks
   */
  static async bulkCreate(records, chunkSize = 500) {
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const result = await prisma.p3kParuhWaktu.createMany({
        data: chunk,
        skipDuplicates: true
      });
      insertedCount += result.count;
    }

    return insertedCount;
  }

  /**
   * Find many with pagination, search, and filters
   */
  static async findMany({ page = 1, limit = 10, search = '', unorNama = '', unorInduk = '', golAkhirNama = '', jenisJabatanNama = '' } = {}) {
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false
    };

    if (search) {
      where.OR = [
        { nipBaru: { contains: search } },
        { nama: { contains: search } },
        { unorNama: { contains: search } },
        { jabatanNama: { contains: search } },
        { nik: { contains: search } }
      ];
    }

    if (unorNama) {
      where.unorNama = { contains: unorNama };
    }

    if (unorInduk) {
      where.unorInduk = { contains: unorInduk };
    }

    if (golAkhirNama) {
      where.golAkhirNama = golAkhirNama;
    }

    if (jenisJabatanNama) {
      where.jenisJabatanNama = jenisJabatanNama;
    }

    const [total, data] = await Promise.all([
      prisma.p3kParuhWaktu.count({ where }),
      prisma.p3kParuhWaktu.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nama: 'asc' }
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find single record by ID or NIP Baru
   */
  static async findByIdOrNip(idOrNip) {
    return prisma.p3kParuhWaktu.findFirst({
      where: {
        OR: [
          { id: idOrNip },
          { nipBaru: idOrNip }
        ],
        isDeleted: false
      }
    });
  }

  /**
   * Get distinct list of Unor Nama for filters
   */
  static async getDistinctUnor() {
    const unors = await prisma.p3kParuhWaktu.findMany({
      where: { isDeleted: false, unorNama: { not: null } },
      select: { unorNama: true },
      distinct: ['unorNama'],
      orderBy: { unorNama: 'asc' }
    });
    return unors.map(u => u.unorNama).filter(Boolean);
  }

  /**
   * Get distinct list of Golongan for filters
   */
  static async getDistinctGolongan() {
    const gols = await prisma.p3kParuhWaktu.findMany({
      where: { isDeleted: false, golAkhirNama: { not: null } },
      select: { golAkhirNama: true },
      distinct: ['golAkhirNama'],
      orderBy: { golAkhirNama: 'asc' }
    });
    return gols.map(g => g.golAkhirNama).filter(Boolean);
  }

  /**
   * Get comprehensive statistics summary of P3K Paruh Waktu
   * @param {Object} options
   * @param {'master'|'staging'} [options.source='master']
   */
  static async getStats({ source = 'master' } = {}) {
    let records = [];

    if (source === 'master') {
      records = await prisma.dataP3kParuhWaktu.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          nipBaru: true,
          nama: true,
          jenisKelamin: true,
          tanggalLahir: true,
          tingkatPendidikanNama: true,
          pendidikanNama: true,
          jabatanNama: true,
          jenisJabatanNama: true,
          unorNama: true,
          lokasiKerjaNama: true,
          tmtCpns: true,
          agamaNama: true,
          jenisKawinNama: true,
          statusPensiun: true
        }
      });
      // Fallback to staging table if master is empty
      if (records.length === 0) {
        records = await prisma.p3kParuhWaktu.findMany({
          where: { isDeleted: false },
          select: {
            id: true,
            nipBaru: true,
            nama: true,
            jenisKelamin: true,
            tanggalLahir: true,
            tingkatPendidikanNama: true,
            pendidikanNama: true,
            jabatanNama: true,
            jenisJabatanNama: true,
            unorNama: true,
            lokasiKerjaNama: true,
            tmtCpns: true,
            agamaNama: true,
            jenisKawinNama: true
          }
        });
      }
    } else {
      records = await prisma.p3kParuhWaktu.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          nipBaru: true,
          nama: true,
          jenisKelamin: true,
          tanggalLahir: true,
          tingkatPendidikanNama: true,
          pendidikanNama: true,
          jabatanNama: true,
          jenisJabatanNama: true,
          unorNama: true,
          lokasiKerjaNama: true,
          tmtCpns: true,
          agamaNama: true,
          jenisKawinNama: true
        }
      });
    }

    const total = records.length;
    let aktif = 0;
    let pensiun = 0;
    let laki = 0;
    let perempuan = 0;
    let tidakDiketahui = 0;

    const pendidikanMap = new Map();
    const jabatanMap = new Map();
    const jenisJabatanMap = new Map();
    const unorMap = new Map();
    const lokasiMap = new Map();
    const agamaMap = new Map();
    const kawinMap = new Map();
    const pengangkatanMap = new Map();

    const ageRanges = [
      { label: '< 30 Tahun', min: 0, max: 29, count: 0, laki: 0, perempuan: 0 },
      { label: '30 - 39 Tahun', min: 30, max: 39, count: 0, laki: 0, perempuan: 0 },
      { label: '40 - 49 Tahun', min: 40, max: 49, count: 0, laki: 0, perempuan: 0 },
      { label: '≥ 50 Tahun', min: 50, max: 120, count: 0, laki: 0, perempuan: 0 }
    ];

    let totalAge = 0;
    let ageCount = 0;
    let minAge = 120;
    let maxAge = 0;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    function parseAge(dateStr) {
      if (!dateStr) return null;
      const parts = dateStr.trim().split('-');
      if (parts.length === 3) {
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          d = parseInt(parts[2], 10);
        }
        const birth = new Date(y, m, d);
        if (isNaN(birth.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return age >= 0 && age < 120 ? age : null;
      }
      return null;
    }

    function normGender(val) {
      if (!val) return 'UNKNOWN';
      const u = String(val).toUpperCase();
      if (u === 'M' || u === 'L' || u === '1' || u.includes('LAKI')) return 'L';
      if (u === 'F' || u === 'P' || u === '2' || u.includes('PEREMPUAN')) return 'P';
      return 'UNKNOWN';
    }

    for (const r of records) {
      if (r.statusPensiun === 'PENSIUN') {
        pensiun++;
      } else {
        aktif++;
      }

      const g = normGender(r.jenisKelamin);
      if (g === 'L') {
        laki++;
      } else if (g === 'P') {
        perempuan++;
      } else {
        tidakDiketahui++;
      }

      const age = parseAge(r.tanggalLahir);
      if (age !== null) {
        totalAge += age;
        ageCount++;
        if (age < minAge) minAge = age;
        if (age > maxAge) maxAge = age;
        const range = ageRanges.find(ar => age >= ar.min && age <= ar.max);
        if (range) {
          range.count++;
          if (g === 'L') range.laki++;
          if (g === 'P') range.perempuan++;
        }
      }

      const incMapWithGender = (map, key, fallback = 'Tidak Diketahui') => {
        const k = key && key.trim() ? key.trim() : fallback;
        if (!map.has(k)) {
          map.set(k, { label: k, count: 0, laki: 0, perempuan: 0 });
        }
        const item = map.get(k);
        item.count++;
        if (g === 'L') item.laki++;
        if (g === 'P') item.perempuan++;
      };

      incMapWithGender(pendidikanMap, r.tingkatPendidikanNama, 'Belum Diatur');
      incMapWithGender(jabatanMap, r.jabatanNama, 'Belum Ditentukan');
      incMapWithGender(jenisJabatanMap, r.jenisJabatanNama, 'Lainnya');
      incMapWithGender(unorMap, r.unorNama, 'Tanpa Unit Kerja');
      incMapWithGender(lokasiMap, r.lokasiKerjaNama, 'Tanpa Lokasi');
      incMapWithGender(agamaMap, r.agamaNama, 'Tidak Diketahui');
      incMapWithGender(kawinMap, r.jenisKawinNama, 'Tidak Diketahui');

      // Pengangkatan (TMT CPNS)
      if (r.tmtCpns) {
        const p = r.tmtCpns.trim().split('-');
        if (p.length === 3) {
          let mm = p[1];
          let yy = p[2].length === 4 ? p[2] : p[0];
          const mIdx = parseInt(mm, 10) - 1;
          const monthText = monthNames[mIdx] || mm;
          const sortKey = parseInt(`${yy}${String(mm).padStart(2, '0')}`, 10);
          const filterValue = `${String(mm).padStart(2, '0')}-${yy}`;
          const label = `TMT ${monthText} ${yy}`;

          if (!pengangkatanMap.has(sortKey)) {
            pengangkatanMap.set(sortKey, { label, filterValue, sortKey, count: 0, laki: 0, perempuan: 0 });
          }
          const item = pengangkatanMap.get(sortKey);
          item.count++;
          if (g === 'L') item.laki++;
          if (g === 'P') item.perempuan++;
        }
      }
    }

    const formatList = (map) => {
      return Array.from(map.values())
        .map(item => {
          const persenLaki = item.count > 0 ? Number(((item.laki / item.count) * 100).toFixed(1)) : 0;
          const persenPerempuan = item.count > 0 ? Number(((item.perempuan / item.count) * 100).toFixed(1)) : 0;
          return { ...item, persenLaki, persenPerempuan };
        })
        .sort((a, b) => b.count - a.count);
    };

    const byPendidikan = formatList(pendidikanMap);
    const byJabatan = formatList(jabatanMap);
    const byJenisJabatan = formatList(jenisJabatanMap);
    const byUnor = formatList(unorMap);
    const byLokasiKerja = formatList(lokasiMap);
    const byAgama = formatList(agamaMap);
    const byStatusKawin = formatList(kawinMap);

    const byAgeRange = ageRanges.map(ar => {
      const persenLaki = ar.count > 0 ? Number(((ar.laki / ar.count) * 100).toFixed(1)) : 0;
      const persenPerempuan = ar.count > 0 ? Number(((ar.perempuan / ar.count) * 100).toFixed(1)) : 0;
      return {
        label: ar.label,
        count: ar.count,
        laki: ar.laki,
        perempuan: ar.perempuan,
        persenLaki,
        persenPerempuan
      };
    });

    const byPengangkatan = Array.from(pengangkatanMap.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(item => {
        const persenLaki = item.count > 0 ? Number(((item.laki / item.count) * 100).toFixed(1)) : 0;
        const persenPerempuan = item.count > 0 ? Number(((item.perempuan / item.count) * 100).toFixed(1)) : 0;
        return {
          label: item.label,
          filterValue: item.filterValue,
          count: item.count,
          laki: item.laki,
          perempuan: item.perempuan,
          persenLaki,
          persenPerempuan
        };
      });

    const persenLaki = total > 0 ? Number(((laki / total) * 100).toFixed(1)) : 0;
    const persenPerempuan = total > 0 ? Number(((perempuan / total) * 100).toFixed(1)) : 0;
    const avgAge = ageCount > 0 ? Number((totalAge / ageCount).toFixed(1)) : 0;

    return {
      summary: {
        total,
        aktif,
        pensiun,
        laki,
        perempuan,
        tidakDiketahui,
        persenLaki,
        persenPerempuan,
        avgAge,
        minAge: minAge < 120 ? minAge : 0,
        maxAge,
        totalUnitKerja: byUnor.length,
        totalJabatan: byJabatan.length
      },
      total,
      gender: {
        laki,
        perempuan,
        tidakDiketahui
      },
      byPendidikan,
      byJabatan,
      byJenisJabatan,
      byUnor,
      byAgeRange,
      byLokasiKerja,
      byPengangkatan,
      byAgama,
      byStatusKawin,
      // Legacy backward compatibility fields
      byGender: [
        { jenisKelamin: 'Laki-laki', count: laki },
        { jenisKelamin: 'Perempuan', count: perempuan }
      ],
      byGolongan: [],
      topUnor: byUnor.slice(0, 10).map(u => ({ unorNama: u.label, count: u.count }))
    };
  }

  /**
   * Delete all records
   */
  static async deleteAll() {
    return prisma.p3kParuhWaktu.deleteMany({});
  }

  /**
   * Delete single record
   */
  static async deleteById(id) {
    return prisma.p3kParuhWaktu.delete({
      where: { id }
    });
  }

  /**
   * Bulk sync / upsert records into data_p3k_paruh_waktu
   * Note: unorIndukId is set to NULL by default for manual mapping.
   */
  static async syncToDataP3kParuhWaktu(records, chunkSize = 500) {
    let syncedCount = 0;

    // Prepare records with unorIndukId = null (manual assignment only)
    const masterRecords = records.map(r => {
      return {
        id: r.id,
        pnsId: r.pnsId || null,
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
        unorIndukId: null, // Diisi secara manual oleh pengguna
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
        eselonId: r.eselonId || null,
        eselonNama: r.eselonNama || null,
        statusPensiun: 'AKTIF',
        isDeleted: false
      };
    });

    for (let i = 0; i < masterRecords.length; i += chunkSize) {
      const chunk = masterRecords.slice(i, i + chunkSize);
      const res = await prisma.dataP3kParuhWaktu.createMany({
        data: chunk,
        skipDuplicates: true
      });
      syncedCount += res.count;
    }

    return syncedCount;
  }

  /**
   * Delete all master data_p3k_paruh_waktu
   */
  static async deleteAllMaster() {
    return prisma.dataP3kParuhWaktu.deleteMany({});
  }

  /**
   * Find many master DataP3kParuhWaktu
   */
  static async findMasterMany({
    page = 1,
    limit = 10,
    search = '',
    unorNama = '',
    unorIndukId = '',
    golAkhirNama = '',
    tingkatPendidikanNama = '',
    jabatanNama = '',
    jenisJabatanNama = '',
    jenisKelamin = '',
    lokasiKerjaNama = '',
    agamaNama = '',
    jenisKawinNama = '',
    tmtCpns = '',
    ageRange = ''
  } = {}) {
    const skip = (page - 1) * limit;
    const where = { isDeleted: false };

    if (search) {
      where.OR = [
        { nipBaru: { contains: search } },
        { nama: { contains: search } },
        { unorNama: { contains: search } },
        { jabatanNama: { contains: search } },
        { pendidikanNama: { contains: search } }
      ];
    }

    if (unorNama) {
      if (unorNama === 'Tanpa Unit Kerja' || unorNama === 'Kosong / Belum Diset') {
        where.OR = [{ unorNama: null }, { unorNama: '' }];
      } else {
        where.unorNama = { contains: unorNama };
      }
    }

    if (unorIndukId) {
      where.unorIndukId = unorIndukId;
    }

    if (golAkhirNama) {
      where.golAkhirNama = golAkhirNama;
    }

    if (tingkatPendidikanNama) {
      if (tingkatPendidikanNama === 'Belum Diatur' || tingkatPendidikanNama === 'Tidak Diketahui') {
        where.OR = [{ tingkatPendidikanNama: null }, { tingkatPendidikanNama: '' }];
      } else {
        where.tingkatPendidikanNama = tingkatPendidikanNama;
      }
    }

    if (jabatanNama) {
      if (jabatanNama === 'Belum Ditentukan' || jabatanNama === 'Tidak Diketahui') {
        where.OR = [{ jabatanNama: null }, { jabatanNama: '' }];
      } else {
        where.jabatanNama = jabatanNama;
      }
    }

    if (jenisJabatanNama) {
      where.jenisJabatanNama = jenisJabatanNama;
    }

    if (jenisKelamin) {
      const u = jenisKelamin.toUpperCase();
      if (u === 'L' || u === 'M' || u === 'LAKI-LAKI') {
        where.OR = [{ jenisKelamin: 'L' }, { jenisKelamin: 'M' }, { jenisKelamin: { contains: 'Laki' } }];
      } else if (u === 'P' || u === 'F' || u === 'PEREMPUAN') {
        where.OR = [{ jenisKelamin: 'P' }, { jenisKelamin: 'F' }, { jenisKelamin: { contains: 'Perempuan' } }];
      }
    }

    if (lokasiKerjaNama) {
      where.lokasiKerjaNama = lokasiKerjaNama;
    }

    if (agamaNama) {
      where.agamaNama = agamaNama;
    }

    if (jenisKawinNama) {
      where.jenisKawinNama = jenisKawinNama;
    }

    if (tmtCpns) {
      where.tmtCpns = { contains: tmtCpns };
    }

    if (ageRange) {
      const all = await prisma.dataP3kParuhWaktu.findMany({
        where: { isDeleted: false },
        select: { id: true, tanggalLahir: true }
      });
      const matchingIds = all.filter(r => {
        if (!r.tanggalLahir) return false;
        const parts = r.tanggalLahir.trim().split('-');
        if (parts.length !== 3) return false;
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10) - 1;
          d = parseInt(parts[2], 10);
        }
        const birth = new Date(y, m, d);
        if (isNaN(birth.getTime())) return false;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        if (ageRange.includes('< 30')) return age < 30;
        if (ageRange.includes('30 - 39')) return age >= 30 && age <= 39;
        if (ageRange.includes('40 - 49')) return age >= 40 && age <= 49;
        if (ageRange.includes('50')) return age >= 50;
        return true;
      }).map(r => r.id);
      where.id = { in: matchingIds };
    }

    const [total, data] = await Promise.all([
      prisma.dataP3kParuhWaktu.count({ where }),
      prisma.dataP3kParuhWaktu.findMany({
        where,
        skip,
        take: limit,
        include: { unorInduk: true },
        orderBy: { nama: 'asc' }
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update Unor Induk Mapping for a single DataP3kParuhWaktu
   */
  static async updateMasterMappingUnor(id, unorIndukId) {
    return prisma.dataP3kParuhWaktu.update({
      where: { id },
      data: { unorIndukId: unorIndukId || null }
    });
  }

  /**
   * Bulk update Unor Induk Mapping for DataP3kParuhWaktu
   */
  static async bulkUpdateMasterMappingUnor(ids, unorIndukId) {
    return prisma.dataP3kParuhWaktu.updateMany({
      where: { id: { in: ids } },
      data: { unorIndukId: unorIndukId || null }
    });
  }

  /**
   * Find single master DataP3kParuhWaktu by ID or NIP Baru
   */
  static async findMasterByIdOrNip(idOrNip) {
    return prisma.dataP3kParuhWaktu.findFirst({
      where: {
        OR: [
          { id: idOrNip },
          { nipBaru: idOrNip }
        ],
        isDeleted: false
      },
      include: {
        unorInduk: true
      }
    });
  }
}

