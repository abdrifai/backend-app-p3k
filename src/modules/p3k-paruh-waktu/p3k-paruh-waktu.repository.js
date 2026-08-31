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
   * Get statistics summary of P3K Paruh Waktu
   */
  static async getStats() {
    const total = await prisma.p3kParuhWaktu.count({
      where: { isDeleted: false }
    });

    const [byGender, byGolongan, byJenisJabatan, topUnor] = await Promise.all([
      prisma.p3kParuhWaktu.groupBy({
        by: ['jenisKelamin'],
        where: { isDeleted: false },
        _count: { _all: true }
      }),
      prisma.p3kParuhWaktu.groupBy({
        by: ['golAkhirNama'],
        where: { isDeleted: false },
        _count: { _all: true },
        orderBy: { _count: { golAkhirNama: 'desc' } },
        take: 10
      }),
      prisma.p3kParuhWaktu.groupBy({
        by: ['jenisJabatanNama'],
        where: { isDeleted: false },
        _count: { _all: true }
      }),
      prisma.p3kParuhWaktu.groupBy({
        by: ['unorNama'],
        where: { isDeleted: false },
        _count: { _all: true },
        orderBy: { _count: { unorNama: 'desc' } },
        take: 10
      })
    ]);

    return {
      total,
      byGender: byGender.map(g => ({ jenisKelamin: g.jenisKelamin || 'Tidak Diketahui', count: g._count._all })),
      byGolongan: byGolongan.map(g => ({ golongan: g.golAkhirNama || 'Tanpa Golongan', count: g._count._all })),
      byJenisJabatan: byJenisJabatan.map(j => ({ jenisJabatan: j.jenisJabatanNama || 'Lainnya', count: j._count._all })),
      topUnor: topUnor.map(u => ({ unorNama: u.unorNama || 'Tanpa Unit Kerja', count: u._count._all }))
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
   */
  static async syncToDataP3kParuhWaktu(records, chunkSize = 500) {
    let syncedCount = 0;

    // 1. Fetch all RefUnors for auto matching
    const refUnors = await prisma.refUnor.findMany({
      where: { isDeleted: false },
      select: { id: true, nama: true }
    });

    // Match helper
    const resolveUnorIndukId = (unorNama, unorInduk) => {
      if (!unorNama && !unorInduk) return null;
      const target = (unorInduk || unorNama || '').toLowerCase();
      for (const ru of refUnors) {
        const rName = ru.nama.toLowerCase();
        if (target.includes(rName) || rName.includes(target)) {
          return ru.id;
        }
      }
      return null;
    };

    // 2. Prepare records
    const masterRecords = records.map(r => {
      const unorIndukId = resolveUnorIndukId(r.unorNama, r.unorInduk);
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
        unorIndukId: unorIndukId,
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
  static async findMasterMany({ page = 1, limit = 10, search = '', unorNama = '', unorIndukId = '', golAkhirNama = '' } = {}) {
    const skip = (page - 1) * limit;
    const where = { isDeleted: false };

    if (search) {
      where.OR = [
        { nipBaru: { contains: search } },
        { nama: { contains: search } },
        { unorNama: { contains: search } },
        { jabatanNama: { contains: search } }
      ];
    }

    if (unorNama) {
      where.unorNama = { contains: unorNama };
    }

    if (unorIndukId) {
      where.unorIndukId = unorIndukId;
    }

    if (golAkhirNama) {
      where.golAkhirNama = golAkhirNama;
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
}

