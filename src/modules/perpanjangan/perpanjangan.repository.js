import prisma from '../../config/database.js';

export class PerpanjanganRepository {
  // --- Template CRUD ---
  static async findAllTemplates() {
    return prisma.templateKontrak.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findTemplateById(id) {
    return prisma.templateKontrak.findUnique({
      where: { id }
    });
  }

  static async createTemplate({ nama, deskripsi, fileUrl, namaFile }) {
    return prisma.templateKontrak.create({
      data: { nama, deskripsi, fileUrl, namaFile }
    });
  }

  static async deleteTemplate(id) {
    return prisma.templateKontrak.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  // --- Usulan CRUD ---
  static async findAllUsulan({ skip, take, status, statusSrikandi, search, unorIndukId, userId, isAdmin }) {
    const where = { AND: [{ isDeleted: false }] };
    
    // Visibility restriction: non-admin only sees created/assigned records
    if (!isAdmin && userId) {
      where.AND.push({
        OR: [
          { editedById: userId },
          { dataP3k: { tasksUsulan: { some: { assignedToUserId: userId } } } }
        ]
      });
    }

    if (status) {
      where.AND.push({ status });
    }
    if (statusSrikandi) {
      if (statusSrikandi === 'NONE' || statusSrikandi === 'null') {
        where.AND.push({ statusSrikandi: null });
      } else if (statusSrikandi !== 'ALL' && statusSrikandi !== 'SEMUA') {
        where.AND.push({ statusSrikandi });
      }
    }
    if (unorIndukId) {
      if (unorIndukId === 'null' || unorIndukId === 'unmapped') {
        where.AND.push({ dataP3k: { unorIndukId: null } });
      } else {
        where.AND.push({ dataP3k: { unorIndukId: unorIndukId } });
      }
    }
    if (search) {
      where.AND.push({
        OR: [
          { dataP3k: { nama: { contains: search } } },
          { dataP3k: { nipBaru: { contains: search } } },
          { dataP3k: { unorNama: { contains: search } } },
          { nomorKontrak: { contains: search } },
          { editedBy: { namaLengkap: { contains: search } } },
          { editedBy: { username: { contains: search } } }
        ]
      });
    }

    const [data, total] = await Promise.all([
      prisma.usulanPerpanjangan.findMany({
        where,
        skip,
        take,
        include: {
          dataP3k: {
            select: {
              id: true, nipBaru: true, nama: true, gelarDepan: true,
              gelarBelakang: true, jabatanNama: true, unorNama: true,
              mkTahun: true, mkBulan: true, tmtCpns: true,
              golAkhirNama: true, golAwalNama: true, statusPensiun: true,
              unorIndukId: true,
              unorInduk: { select: { id: true, nama: true } }
            }
          },
          templateKontrak: {
            select: { id: true, nama: true }
          },
          editedBy: {
            select: { id: true, username: true, namaLengkap: true, role: true, foto: true }
          },
          srikandiHistories: {
            include: {
              createdBy: {
                select: { id: true, username: true, namaLengkap: true, foto: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.usulanPerpanjangan.count({ where })
    ]);

    return { data, total };
  }

  static async findUsulanById(id) {
    return prisma.usulanPerpanjangan.findUnique({
      where: { id },
      include: {
        dataP3k: {
          select: {
            id: true, nipBaru: true, nama: true, gelarDepan: true,
            gelarBelakang: true, jabatanNama: true, unorNama: true,
            tempatLahirNama: true, tanggalLahir: true, jenisKelamin: true,
            golAkhirNama: true, golAwalNama: true, pendidikanNama: true,
            tahunLulus: true, alamat: true, mkBulan: true,
            nomorSkCpns: true, tanggalSkCpns: true, tmtCpns: true,
            lokasiKerjaNama: true, mkTahun: true, statusPensiun: true,
            unorInduk: { select: { nama: true } }
          }
        },
        templateKontrak: true,
        srikandiHistories: {
          include: {
            createdBy: {
              select: { id: true, username: true, namaLengkap: true, foto: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  static async createUsulan({ dataP3kId, tanggalMulai, tanggalSelesai, keterangan, templateKontrakId, nomorKontrak, tanggalTtd, kontrakKe, editedById }) {
    return prisma.usulanPerpanjangan.create({
      data: {
        dataP3kId,
        tanggalMulai,
        tanggalSelesai,
        keterangan,
        templateKontrakId,
        nomorKontrak,
        tanggalTtd,
        kontrakKe,
        editedById,
        status: 'PENDING'
      },
      include: {
        dataP3k: {
          select: { id: true, nipBaru: true, nama: true }
        }
      }
    });
  }

  static async updateUsulanStatus(id, { status, alasanPenolakan, generatedFileUrl, finalFileUrl, statusTte, pdfDraftUrl, pdfSignedUrl }) {
    const data = { status };
    if (alasanPenolakan !== undefined) data.alasanPenolakan = alasanPenolakan;
    if (generatedFileUrl) data.generatedFileUrl = generatedFileUrl;
    if (finalFileUrl) data.finalFileUrl = finalFileUrl;
    if (statusTte !== undefined) data.statusTte = statusTte;
    if (pdfDraftUrl !== undefined) data.pdfDraftUrl = pdfDraftUrl;
    if (pdfSignedUrl !== undefined) data.pdfSignedUrl = pdfSignedUrl;

    return prisma.usulanPerpanjangan.update({
      where: { id },
      data,
      include: {
        dataP3k: {
          select: { id: true, nipBaru: true, nama: true }
        }
      }
    });
  }

  static async updateUsulan(id, data) {
    return prisma.usulanPerpanjangan.update({
      where: { id },
      data,
      include: {
        dataP3k: {
          select: { id: true, nipBaru: true, nama: true }
        }
      }
    });
  }

  static async deleteUsulan(id) {
    return prisma.usulanPerpanjangan.delete({
      where: { id }
    });
  }

  static async getLatestContractInfo(dataP3kId) {
    const [latestRiwayat, latestUsulan] = await Promise.all([
      prisma.riwayatKontrak.findFirst({
        where: { dataP3kId, isDeleted: false },
        orderBy: [
          { kontrakKe: 'desc' },
          { tanggalSelesai: 'desc' }
        ]
      }),
      prisma.usulanPerpanjangan.findFirst({
        where: { dataP3kId, isDeleted: false, status: { not: 'REJECTED' } },
        orderBy: [
          { kontrakKe: 'desc' },
          { tanggalSelesai: 'desc' }
        ]
      })
    ]);

    return { latestRiwayat, latestUsulan };
  }

  static async findMaxSequence(year) {
    const pattern = `%/${year}`;
    
    // Check both tables and find all contract numbers for the year
    const [usulans, riwayats] = await Promise.all([
      prisma.usulanPerpanjangan.findMany({
        where: { nomorKontrak: { contains: pattern } },
        select: { nomorKontrak: true }
      }),
      prisma.riwayatKontrak.findMany({
        where: { nomorKontrak: { contains: pattern } },
        select: { nomorKontrak: true }
      })
    ]);

    const allNomors = [
      ...usulans.map(u => u.nomorKontrak),
      ...riwayats.map(r => r.nomorKontrak)
    ].filter(Boolean);

    let maxSeq = 0;
    for (const nomor of allNomors) {
      // Expected format: 800.1.13.2/0001/PPPK.Ts/BKPSDMD-B.TU/2026
      const parts = nomor.split('/');
      if (parts.length >= 2) {
        const seqStr = parts[1];
  const seqNum = parseInt(seqStr, 10);        
if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    }

    return maxSeq;
  }

  static async checkNomorExists(nomorKontrak) {
    if (!nomorKontrak) return false;
    
    const [usulan, riwayat] = await Promise.all([
      prisma.usulanPerpanjangan.findFirst({
        where: { nomorKontrak, isDeleted: false },
        select: { id: true }
      }),
      prisma.riwayatKontrak.findFirst({
        where: { nomorKontrak, isDeleted: false },
        select: { id: true }
      })
    ]);

    return !!(usulan || riwayat);
  }

  static async getDashboardStats() {
    const [
      totalPegawaiAktif,
      totalUsulan,
      statusGroups,
      distinctDataP3kUsulan,
      dataP3kWithUsulan,
      usersWithTasks,
      recentUsulan
    ] = await Promise.all([
      prisma.dataP3k.count({
        where: { statusPensiun: 'AKTIF', isDeleted: false }
      }),
      prisma.usulanPerpanjangan.count({
        where: { isDeleted: false }
      }),
      prisma.usulanPerpanjangan.groupBy({
        by: ['status'],
        where: { isDeleted: false },
        _count: { _all: true }
      }),
      prisma.usulanPerpanjangan.findMany({
        where: { isDeleted: false },
        distinct: ['dataP3kId'],
        select: { dataP3kId: true }
      }),
      prisma.dataP3k.findMany({
        where: { statusPensiun: 'AKTIF', isDeleted: false },
        select: {
          id: true,
          nipBaru: true,
          nama: true,
          unorNama: true,
          unorIndukId: true,
          unorInduk: { select: { id: true, nama: true } },
          usulanPerpanjangan: {
            where: { isDeleted: false },
            select: { id: true, status: true, updatedAt: true }
          }
        }
      }),
      prisma.user.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          username: true,
          namaLengkap: true,
          role: true,
          tasks: {
            where: { isDeleted: false },
            select: { isCompleted: true }
          },
          usulanTasks: {
            where: { isDeleted: false },
            select: { isCompleted: true }
          },
          usulanEditedTasks: {
            where: { isDeleted: false },
            select: { id: true, status: true }
          }
        }
      }),
      prisma.usulanPerpanjangan.findMany({
        where: { isDeleted: false },
        take: 500,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          status: true,
          nomorKontrak: true,
          tanggalMulai: true,
          tanggalSelesai: true,
          updatedAt: true,
          dataP3k: {
            select: {
              id: true,
              nipBaru: true,
              nama: true,
              unorNama: true,
              unorInduk: { select: { nama: true } }
            }
          },
          editedBy: {
            select: { id: true, username: true, namaLengkap: true }
          }
        }
      })
    ]);

    return {
      totalPegawaiAktif,
      totalUsulan,
      statusGroups,
      totalPegawaiDenganUsulan: distinctDataP3kUsulan.length,
      dataP3kWithUsulan,
      usersWithTasks,
      recentUsulan
    };
  }

  /**
   * Get daily work recap for users/operators on contract renewals based on real user activities (WITA / UTC+8)
   */
  static async getKinerjaHarian({ date, startDate, endDate, userId, status } = {}) {
    let start, end;
    if (startDate && endDate) {
      start = new Date(`${startDate}T00:00:00.000+08:00`);
      end = new Date(`${endDate}T23:59:59.999+08:00`);
    } else if (date) {
      start = new Date(`${date}T00:00:00.000+08:00`);
      end = new Date(`${date}T23:59:59.999+08:00`);
    }

    const logWhere = {
      ...(start && end ? { createdAt: { gte: start, lte: end } } : {}),
      OR: [
        { entityType: 'UsulanPerpanjangan' },
        { entityType: 'TaskUsulan' },
        { action: { in: ['CREATE_USULAN', 'APPROVE_USULAN', 'PROCESS_SRIKANDI', 'UPDATE_STATUS_SRIKANDI', 'FINALIZE_USULAN', 'REJECT_USULAN', 'UPDATE_USULAN', 'DELETE_APPROVED_USULAN'] } }
      ]
    };
    if (userId) logWhere.userId = userId;

    const activityLogs = await prisma.activityLog.findMany({
      where: logWhere,
      include: {
        user: {
          select: { id: true, username: true, namaLengkap: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (activityLogs.length > 0) {
      let records = activityLogs.map(log => {
        let mappedStatus = 'PENDING';
        if (log.action === 'APPROVE_USULAN') mappedStatus = 'APPROVED';
        else if (log.action === 'PROCESS_SRIKANDI' || log.action === 'UPDATE_STATUS_SRIKANDI') mappedStatus = 'UPLOAD_SRIKANDI';
        else if (log.action === 'FINALIZE_USULAN') mappedStatus = 'SELESAI';
        else if (log.action === 'REJECT_USULAN') mappedStatus = 'REJECTED';
        else if (log.action === 'CREATE_USULAN' || log.action === 'UPDATE_USULAN') mappedStatus = 'PENDING';
        else if (log.action === 'COMPLETE_TASK' && log.entityType === 'TaskUsulan') mappedStatus = 'PENDING';

        return {
          id: log.id,
          status: mappedStatus,
          action: log.action,
          editedById: log.userId,
          editedBy: log.user,
          createdAt: log.createdAt
        };
      });

      if (status) {
        records = records.filter(r => r.status === status);
      }

      return { records };
    }

    // Fallback to legacy creation/update records if no activity logs exist for that date range
    const legacyWhere = { isDeleted: false };
    if (start && end) {
      legacyWhere.OR = [
        { createdAt: { gte: start, lte: end } },
        { updatedAt: { gte: start, lte: end } }
      ];
    }
    if (userId) legacyWhere.editedById = userId;
    if (status) legacyWhere.status = status;

    const legacyRecords = await prisma.usulanPerpanjangan.findMany({
      where: legacyWhere,
      select: {
        id: true,
        status: true,
        editedById: true,
        editedBy: {
          select: {
            id: true,
            username: true,
            namaLengkap: true,
            role: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    return { records: legacyRecords };
  }

  // --- Srikandi Timeline & History ---
  static async createSrikandiHistory({ usulanId, status, keterangan, createdById }) {
    return prisma.srikandiHistory.create({
      data: {
        usulanId,
        status,
        keterangan,
        createdById
      },
      include: {
        createdBy: {
          select: { id: true, username: true, namaLengkap: true, foto: true }
        }
      }
    });
  }

  static async getSrikandiTimeline(usulanId) {
    return prisma.srikandiHistory.findMany({
      where: { usulanId },
      include: {
        createdBy: {
          select: { id: true, username: true, namaLengkap: true, foto: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async updateStatusSrikandi(id, statusSrikandi) {
    return prisma.usulanPerpanjangan.update({
      where: { id },
      data: { statusSrikandi }
    });
  }

  static async getUserTaskCounts(userIds) {
    if (!userIds || userIds.length === 0) return [];
    return prisma.taskUsulan.groupBy({
      by: ['assignedToUserId'],
      where: {
        assignedToUserId: { in: userIds },
        isDeleted: false
      },
      _count: { id: true }
    });
  }

  /**
   * Mengambil statistik rekapitulasi perpanjangan PK per angkatan (TMT)
   * dan jumlah pegawai yang tidak diperpanjang (pemberhentian / pensiun),
   * terpisah antara PPPK Penuh Waktu dan PPPK Paruh Waktu.
   */
  static async getStatistikPerpanjanganPk({ kategori = 'ALL' } = {}) {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const [
      p3kGroups,
      paruhGroups,
      p3kPensiunGroups,
      paruhPensiunGroups,
      refJenisPensiunList
    ] = await Promise.all([
      // 1. P3K Penuh Waktu groups
      prisma.dataP3k.groupBy({
        by: ['tmtCpns', 'statusPensiun'],
        where: { isDeleted: false },
        _count: { id: true }
      }),
      // 2. P3K Paruh Waktu groups
      prisma.dataP3kParuhWaktu.groupBy({
        by: ['tmtCpns', 'statusPensiun'],
        where: { isDeleted: false },
        _count: { id: true }
      }),
      // 3. Jenis pensiun Penuh Waktu
      prisma.dataP3k.groupBy({
        by: ['jenisPensiunId'],
        where: { isDeleted: false, statusPensiun: { not: 'AKTIF' } },
        _count: { id: true }
      }),
      // 4. Jenis pensiun Paruh Waktu
      prisma.dataP3kParuhWaktu.groupBy({
        by: ['jenisPensiunId'],
        where: { isDeleted: false, statusPensiun: { not: 'AKTIF' } },
        _count: { id: true }
      }),
      // 5. Ref Jenis Pensiun
      prisma.refJenisPensiun.findMany({
        where: { isDeleted: false },
        select: { id: true, kode: true, nama: true }
      })
    ]);

    const refJenisMap = {};
    refJenisPensiunList.forEach(r => {
      refJenisMap[r.id] = r.nama;
    });

    const processDataSet = (groups, pensiunGroups) => {
      const angkatanMap = {};
      let totalPegawai = 0;
      let totalAktif = 0;
      let totalTidakDiperpanjang = 0;

      groups.forEach(item => {
        const rawTmt = item.tmtCpns;
        const count = item._count.id;
        const isTidakDiperpanjang = item.statusPensiun && item.statusPensiun !== 'AKTIF';

        totalPegawai += count;
        if (isTidakDiperpanjang) {
          totalTidakDiperpanjang += count;
        } else {
          totalAktif += count;
        }

        let sortKey = 99999999;
        let label = 'Tanpa TMT';
        let key = 'NO_TMT';

        if (rawTmt && rawTmt.trim()) {
          const parts = rawTmt.trim().split('-');
          let dd = '01', mm = '01', yyyy = '1970';
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              yyyy = parts[0];
              mm = parts[1];
              dd = parts[2];
            } else {
              dd = parts[0];
              mm = parts[1];
              yyyy = parts[2];
            }
            const mIdx = parseInt(mm, 10) - 1;
            const mName = (mIdx >= 0 && mIdx < 12) ? monthNames[mIdx] : mm;
            label = `TMT ${dd} ${mName} ${yyyy}`;
            sortKey = parseInt(`${yyyy}${String(mm).padStart(2, '0')}${String(dd).padStart(2, '0')}`, 10);
            key = `${dd}-${mm}-${yyyy}`;
          }
        }

        if (!angkatanMap[key]) {
          angkatanMap[key] = {
            key,
            label,
            sortKey,
            total: 0,
            aktif: 0,
            tidakDiperpanjang: 0,
            rawKeys: []
          };
        }

        if (rawTmt && !angkatanMap[key].rawKeys.includes(rawTmt)) {
          angkatanMap[key].rawKeys.push(rawTmt);
        }
        angkatanMap[key].total += count;
        if (isTidakDiperpanjang) {
          angkatanMap[key].tidakDiperpanjang += count;
        } else {
          angkatanMap[key].aktif += count;
        }
      });

      const byAngkatan = Object.values(angkatanMap)
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(item => {
          const persentaseAktif = item.total > 0 ? Number(((item.aktif / item.total) * 100).toFixed(1)) : 0;
          const persentaseTidakDiperpanjang = item.total > 0 ? Number(((item.tidakDiperpanjang / item.total) * 100).toFixed(1)) : 0;
          return {
            ...item,
            persentaseAktif,
            persentaseTidakDiperpanjang
          };
        });

      const jenisPensiunMap = {};
      pensiunGroups.forEach(item => {
        const id = item.jenisPensiunId;
        const count = item._count.id;
        const nama = id && refJenisMap[id] ? refJenisMap[id] : 'Tanpa Keterangan / Lainnya';
        if (!jenisPensiunMap[nama]) {
          jenisPensiunMap[nama] = 0;
        }
        jenisPensiunMap[nama] += count;
      });

      const byJenisPemberhentian = Object.entries(jenisPensiunMap)
        .map(([nama, count]) => ({
          nama,
          count,
          percentage: totalTidakDiperpanjang > 0 ? Number(((count / totalTidakDiperpanjang) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.count - a.count);

      const persentaseAktif = totalPegawai > 0 ? Number(((totalAktif / totalPegawai) * 100).toFixed(1)) : 0;
      const persentaseTidakDiperpanjang = totalPegawai > 0 ? Number(((totalTidakDiperpanjang / totalPegawai) * 100).toFixed(1)) : 0;

      return {
        summary: {
          totalPegawai,
          totalAktif,
          totalTidakDiperpanjang,
          totalAngkatan: byAngkatan.length,
          persentaseAktif,
          persentaseTidakDiperpanjang
        },
        byAngkatan,
        byJenisPemberhentian
      };
    };

    const dataPenuhWaktu = processDataSet(p3kGroups, p3kPensiunGroups);
    const dataParuhWaktu = processDataSet(paruhGroups, paruhPensiunGroups);
    const dataGabungan = processDataSet([...p3kGroups, ...paruhGroups], [...p3kPensiunGroups, ...paruhPensiunGroups]);

    let activeData = dataGabungan;
    if (kategori === 'PENUH_WAKTU') {
      activeData = dataPenuhWaktu;
    } else if (kategori === 'PARUH_WAKTU') {
      activeData = dataParuhWaktu;
    }

    return {
      activeKategori: kategori,
      summary: {
        totalPegawai: activeData.summary.totalPegawai,
        totalAktif: activeData.summary.totalAktif,
        totalTidakDiperpanjang: activeData.summary.totalTidakDiperpanjang,
        totalAngkatan: activeData.summary.totalAngkatan,
        persentaseAktif: activeData.summary.persentaseAktif,
        persentaseTidakDiperpanjang: activeData.summary.persentaseTidakDiperpanjang,
        penuhWaktu: dataPenuhWaktu.summary,
        paruhWaktu: dataParuhWaktu.summary,
        gabungan: dataGabungan.summary
      },
      penuhWaktu: dataPenuhWaktu,
      paruhWaktu: dataParuhWaktu,
      byAngkatan: activeData.byAngkatan,
      byJenisPemberhentian: activeData.byJenisPemberhentian
    };
  }

  /**
   * Mengambil daftar detail pegawai untuk statistik perpanjangan PK (paginated & searchable)
   */
  static async getDetailStatistikPegawai({ page = 1, limit = 50, search = '', tmtCpns = '', status = 'ALL', kategori = 'ALL' } = {}) {
    const skip = (page - 1) * limit;

    const buildWhere = () => {
      const where = { isDeleted: false, AND: [] };

      if (status === 'AKTIF') {
        where.AND.push({ statusPensiun: 'AKTIF' });
      } else if (status === 'PENSIUN' || status === 'TIDAK_DIPERPANJANG') {
        where.AND.push({ statusPensiun: { not: 'AKTIF' } });
      }

      if (tmtCpns && tmtCpns !== 'ALL' && tmtCpns !== '') {
        if (tmtCpns === 'NO_TMT') {
          where.AND.push({
            OR: [
              { tmtCpns: null },
              { tmtCpns: '' }
            ]
          });
        } else {
          const parts = tmtCpns.split('-');
          const orList = [{ tmtCpns }];
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              orList.push({ tmtCpns: `${parts[2]}-${parts[1]}-${parts[0]}` });
            } else {
              orList.push({ tmtCpns: `${parts[2]}-${parts[1]}-${parts[0]}` });
            }
          }
          where.AND.push({ OR: orList });
        }
      }

      if (search && search.trim()) {
        const s = search.trim();
        where.AND.push({
          OR: [
            { nama: { contains: s } },
            { nipBaru: { contains: s } },
            { unorNama: { contains: s } },
            { jabatanNama: { contains: s } }
          ]
        });
      }

      return where;
    };

    const selectFields = {
      id: true,
      nipBaru: true,
      nama: true,
      gelarDepan: true,
      gelarBelakang: true,
      jabatanNama: true,
      unorNama: true,
      tmtCpns: true,
      statusPensiun: true,
      jenisKelamin: true,
      jenisPensiun: { select: { id: true, kode: true, nama: true } },
      arsipSkPensiun: { select: { id: true, nomorSk: true, tanggalSk: true, fileUrl: true } }
    };

    if (kategori === 'PARUH_WAKTU') {
      const where = buildWhere();
      const [records, total] = await Promise.all([
        prisma.dataP3kParuhWaktu.findMany({
          where,
          skip,
          take: limit,
          select: selectFields,
          orderBy: { nama: 'asc' }
        }),
        prisma.dataP3kParuhWaktu.count({ where })
      ]);

      const formatted = records.map(r => ({
        ...r,
        kategoriPegawai: 'PARUH_WAKTU',
        isTidakDiperpanjang: r.statusPensiun && r.statusPensiun !== 'AKTIF',
        usulanPerpanjanganTerakhir: null
      }));

      return {
        data: formatted,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      };
    }

    if (kategori === 'PENUH_WAKTU') {
      const where = buildWhere();
      const [records, total] = await Promise.all([
        prisma.dataP3k.findMany({
          where,
          skip,
          take: limit,
          select: {
            ...selectFields,
            usulanPerpanjangan: {
              where: { isDeleted: false },
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                status: true,
                statusSrikandi: true,
                nomorKontrak: true,
                tanggalMulai: true,
                tanggalSelesai: true
              }
            }
          },
          orderBy: { nama: 'asc' }
        }),
        prisma.dataP3k.count({ where })
      ]);

      const formatted = records.map(r => {
        const latestUsulan = r.usulanPerpanjangan && r.usulanPerpanjangan.length > 0 ? r.usulanPerpanjangan[0] : null;
        return {
          ...r,
          kategoriPegawai: 'PENUH_WAKTU',
          isTidakDiperpanjang: r.statusPensiun && r.statusPensiun !== 'AKTIF',
          usulanPerpanjanganTerakhir: latestUsulan
        };
      });

      return {
        data: formatted,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      };
    }

    // Kategori ALL: Paginate across both Penuh Waktu and Paruh Waktu
    const where = buildWhere();
    const [totalPenuh, totalParuh] = await Promise.all([
      prisma.dataP3k.count({ where }),
      prisma.dataP3kParuhWaktu.count({ where })
    ]);
    const total = totalPenuh + totalParuh;
    const combinedRecords = [];

    if (skip < totalPenuh) {
      const p3kTake = Math.min(limit, totalPenuh - skip);
      const p3kRecords = await prisma.dataP3k.findMany({
        where,
        skip,
        take: p3kTake,
        select: {
          ...selectFields,
          usulanPerpanjangan: {
            where: { isDeleted: false },
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              statusSrikandi: true,
              nomorKontrak: true,
              tanggalMulai: true,
              tanggalSelesai: true
            }
          }
        },
        orderBy: { nama: 'asc' }
      });

      combinedRecords.push(...p3kRecords.map(r => ({
        ...r,
        kategoriPegawai: 'PENUH_WAKTU',
        isTidakDiperpanjang: r.statusPensiun && r.statusPensiun !== 'AKTIF',
        usulanPerpanjanganTerakhir: r.usulanPerpanjangan?.[0] || null
      })));

      if (combinedRecords.length < limit && totalParuh > 0) {
        const paruhTake = limit - combinedRecords.length;
        const paruhRecords = await prisma.dataP3kParuhWaktu.findMany({
          where,
          skip: 0,
          take: paruhTake,
          select: selectFields,
          orderBy: { nama: 'asc' }
        });

        combinedRecords.push(...paruhRecords.map(r => ({
          ...r,
          kategoriPegawai: 'PARUH_WAKTU',
          isTidakDiperpanjang: r.statusPensiun && r.statusPensiun !== 'AKTIF',
          usulanPerpanjanganTerakhir: null
        })));
      }
    } else {
      const paruhSkip = skip - totalPenuh;
      const paruhRecords = await prisma.dataP3kParuhWaktu.findMany({
        where,
        skip: paruhSkip,
        take: limit,
        select: selectFields,
        orderBy: { nama: 'asc' }
      });

      combinedRecords.push(...paruhRecords.map(r => ({
        ...r,
        kategoriPegawai: 'PARUH_WAKTU',
        isTidakDiperpanjang: r.statusPensiun && r.statusPensiun !== 'AKTIF',
        usulanPerpanjanganTerakhir: null
      })));
    }

    return {
      data: combinedRecords,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }
}



