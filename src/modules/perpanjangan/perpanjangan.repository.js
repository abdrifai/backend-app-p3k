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
  static async findAllUsulan({ skip, take, status, search, userId, isAdmin }) {
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
              unorInduk: { select: { nama: true } }
            }
          },
          templateKontrak: {
            select: { id: true, nama: true }
          },
          editedBy: {
            select: { id: true, username: true, namaLengkap: true, role: true, foto: true }
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
        templateKontrak: true
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

  static async updateUsulanStatus(id, { status, alasanPenolakan, generatedFileUrl, finalFileUrl }) {
    const data = { status };
    if (alasanPenolakan !== undefined) data.alasanPenolakan = alasanPenolakan;
    if (generatedFileUrl) data.generatedFileUrl = generatedFileUrl;
    if (finalFileUrl) data.finalFileUrl = finalFileUrl;

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
          unorInduk: { select: { nama: true } },
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
}

