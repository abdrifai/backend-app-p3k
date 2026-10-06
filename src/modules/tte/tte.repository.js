import prisma from '../../config/database.js';

export const tteRepository = {
  async findAntrianPegawai(dataP3kId) {
    return prisma.usulanPerpanjangan.findMany({
      where: {
        dataP3kId,
        isDeleted: false,
        statusTte: 'MENUNGGU_TTE_PEGAWAI'
      },
      select: {
        id: true,
        nomorKontrak: true,
        kontrakKe: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        statusTte: true,
        pdfDraftUrl: true,
        pdfSignedUrl: true,
        createdAt: true,
        dataP3k: {
          select: {
            nama: true,
            nipBaru: true,
            nik: true,
            jabatanNama: true,
            unorNama: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async findUsulanById(id) {
    return prisma.usulanPerpanjangan.findFirst({
      where: { id, isDeleted: false },
      include: {
        dataP3k: true,
        templateKontrak: true,
        logTandaTangan: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { namaLengkap: true, role: true } }
          }
        }
      }
    });
  },

  async findAntrianPejabat(statusTte, { search, page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      isDeleted: false,
      statusTte
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { nomorKontrak: { contains: q } },
        { dataP3k: { nama: { contains: q } } },
        { dataP3k: { nipBaru: { contains: q } } }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.usulanPerpanjangan.count({ where }),
      prisma.usulanPerpanjangan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nomorKontrak: true,
          kontrakKe: true,
          tanggalMulai: true,
          tanggalSelesai: true,
          statusTte: true,
          pdfDraftUrl: true,
          pdfSignedUrl: true,
          createdAt: true,
          dataP3k: {
            select: {
              nama: true,
              nipBaru: true,
              nik: true,
              jabatanNama: true,
              unorNama: true
            }
          }
        }
      })
    ]);

    return {
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async findPejabatByUserId(userId) {
    return prisma.pejabatPenandatangan.findFirst({
      where: { userId, isActive: true, isDeleted: false }
    });
  },

  async listPejabat() {
    return prisma.pejabatPenandatangan.findMany({
      where: { isDeleted: false },
      orderBy: { urutan: 'asc' },
      include: {
        user: { select: { id: true, username: true, email: true, namaLengkap: true } }
      }
    });
  },

  async createPejabat(data) {
    return prisma.pejabatPenandatangan.create({ data });
  },

  async updatePejabat(id, data) {
    return prisma.pejabatPenandatangan.update({ where: { id }, data });
  },

  async deletePejabat(id) {
    return prisma.pejabatPenandatangan.update({
      where: { id },
      data: { isDeleted: true, isActive: false }
    });
  },

  async applyTteTransaction({ usulan, tahap, jenis, signerNik, userId, statusBerikutnya, signedFileUrl, idDokumenBsre, ipAddress }) {
    return prisma.$transaction(async (tx) => {
      // 1. Rekam Log Tanda Tangan
      await tx.logTandaTangan.create({
        data: {
          usulanId: usulan.id,
          tahap,
          jenis,
          userId,
          nik: signerNik,
          status: 'SUKSES',
          pesan: `Tanda tangan elektronik ${jenis} pada tahap ${tahap} berhasil dibubuhkan`,
          idDokumenBsre,
          ipAddress
        }
      });

      // 2. Update status TTE usulan
      const isFinal = statusBerikutnya === 'TTE_SELESAI';
      const updatedUsulan = await tx.usulanPerpanjangan.update({
        where: { id: usulan.id },
        data: {
          statusTte: statusBerikutnya,
          pdfSignedUrl: signedFileUrl,
          ...(isFinal ? {
            status: 'SELESAI',
            finalFileUrl: signedFileUrl
          } : {})
        }
      });

      // 3. Bila TTE Selesai, buatkan RiwayatKontrak secara otomatis
      if (isFinal) {
        let arsipKontrakId = null;
        if (signedFileUrl) {
          const arsip = await tx.arsipKontrak.create({
            data: {
              namaFile: `Kontrak_TTE_${usulan.nomorKontrak || usulan.id}.pdf`,
              fileUrl: signedFileUrl
            }
          });
          arsipKontrakId = arsip.id;
        }

        await tx.riwayatKontrak.create({
          data: {
            dataP3kId: usulan.dataP3kId,
            kontrakKe: usulan.kontrakKe !== null && usulan.kontrakKe !== undefined ? Number(usulan.kontrakKe) : 1,
            nomorKontrak: usulan.nomorKontrak || '',
            tanggalMulai: usulan.tanggalMulai,
            tanggalSelesai: usulan.tanggalSelesai,
            arsipKontrakId
          }
        });
      }

      return updatedUsulan;
    });
  },

  async applyTolakTte({ usulan, tahap, jenis, signerNik, userId, catatan, ipAddress }) {
    return prisma.$transaction(async (tx) => {
      await tx.logTandaTangan.create({
        data: {
          usulanId: usulan.id,
          tahap,
          jenis,
          userId,
          nik: signerNik,
          status: 'DITOLAK',
          pesan: `Penandatangan menolak pembubuhan TTE: ${catatan}`,
          ipAddress
        }
      });

      const updated = await tx.usulanPerpanjangan.update({
        where: { id: usulan.id },
        data: {
          statusTte: 'DITOLAK_PENANDATANGAN',
          catatanTte: catatan
        }
      });

      return updated;
    });
  }
};
