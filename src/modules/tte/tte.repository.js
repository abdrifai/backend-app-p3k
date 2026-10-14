import prisma from '../../config/database.js';

export const tteRepository = {
  async findRiwayatPegawai(dataP3kId) {
    return prisma.usulanPerpanjangan.findMany({
      where: {
        dataP3kId,
        isDeleted: false,
        statusTte: {
          in: ['MENUNGGU_TTE_BUPATI', 'TTE_SELESAI', 'DITOLAK_PENANDATANGAN']
        }
      },
      select: {
        id: true,
        nomorKontrak: true,
        kontrakKe: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        statusTte: true,
        catatanTte: true,
        pdfDraftUrl: true,
        pdfSignedUrl: true,
        finalFileUrl: true,
        createdAt: true,
        updatedAt: true,
        dataP3k: {
          select: {
            nama: true,
            nipBaru: true,
            nik: true,
            jabatanNama: true,
            unorNama: true,
            golAkhirNama: true
          }
        },
        logTandaTangan: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            tahap: true,
            jenis: true,
            status: true,
            pesan: true,
            idDokumenBsre: true,
            createdAt: true,
            user: {
              select: {
                namaLengkap: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  },

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

  async updateUsulan(id, data) {
    return prisma.usulanPerpanjangan.update({
      where: { id },
      data,
      include: {
        dataP3k: true,
        templateKontrak: true
      }
    });
  },

  async findActiveTemplate() {
    return prisma.templateKontrak.findFirst({
      where: {
        isDeleted: false,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async findAntrianPejabat(statusTte, { search, page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;
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
        take: limitNum,
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
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  },

  async findRiwayatPejabat(userId, { search, status, page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    // Normalisasi parameter status
    let normalizedStatus = status ? status.trim().toUpperCase() : '';
    if (normalizedStatus === 'SUCCESS') normalizedStatus = 'SUKSES';
    if (normalizedStatus === 'FAILED') normalizedStatus = 'DITOLAK';

    // Jika filter SELESAI / TTE_SELESAI: ambil daftar kontrak yang telah rampung final lingkup Pemkab
    if (normalizedStatus === 'SELESAI' || normalizedStatus === 'TTE_SELESAI') {
      const whereUsulan = {
        isDeleted: false,
        statusTte: 'TTE_SELESAI'
      };

      if (search && search.trim()) {
        const q = search.trim();
        whereUsulan.OR = [
          { nomorKontrak: { contains: q } },
          { dataP3k: { nama: { contains: q } } },
          { dataP3k: { nipBaru: { contains: q } } },
          { dataP3k: { unorNama: { contains: q } } }
        ];
      }

      const [total, items] = await Promise.all([
        prisma.usulanPerpanjangan.count({ where: whereUsulan }),
        prisma.usulanPerpanjangan.findMany({
          where: whereUsulan,
          skip,
          take: limitNum,
          orderBy: { updatedAt: 'desc' },
          include: {
            dataP3k: {
              select: {
                nama: true,
                nipBaru: true,
                jabatanNama: true,
                unorNama: true
              }
            }
          }
        })
      ]);

      const mappedItems = items.map((u) => ({
        id: u.id,
        usulanId: u.id,
        tahap: 'TTE_BUPATI',
        jenis: 'TTE',
        status: 'SUKSES',
        pesan: 'Dokumen kontrak telah selesai dan sah ditandatangani final oleh Bupati',
        signedFileUrl: u.pdfSignedUrl || u.finalFileUrl,
        createdAt: u.updatedAt,
        usulan: u
      }));

      return {
        data: mappedItems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    }

    const where = {
      userId,
      ...(normalizedStatus ? { status: normalizedStatus } : {})
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.usulan = {
        OR: [
          { nomorKontrak: { contains: q } },
          { dataP3k: { nama: { contains: q } } },
          { dataP3k: { nipBaru: { contains: q } } }
        ]
      };
    }

    const [total, items] = await Promise.all([
      prisma.logTandaTangan.count({ where }),
      prisma.logTandaTangan.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          usulan: {
            select: {
              id: true,
              nomorKontrak: true,
              kontrakKe: true,
              tanggalMulai: true,
              tanggalSelesai: true,
              statusTte: true,
              pdfDraftUrl: true,
              pdfSignedUrl: true,
              dataP3k: {
                select: {
                  nama: true,
                  nipBaru: true,
                  jabatanNama: true,
                  unorNama: true
                }
              }
            }
          }
        }
      })
    ]);

    return {
      data: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  },

  async findMonitoringTte({ search, statusTte, page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      isDeleted: false,
      statusTte: { not: null }
    };

    if (statusTte && statusTte.trim() && statusTte !== 'ALL') {
      where.statusTte = statusTte.trim();
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { nomorKontrak: { contains: q } },
        { dataP3k: { nama: { contains: q } } },
        { dataP3k: { nipBaru: { contains: q } } },
        { dataP3k: { unorNama: { contains: q } } }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.usulanPerpanjangan.count({ where }),
      prisma.usulanPerpanjangan.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          dataP3k: {
            select: {
              id: true,
              nama: true,
              nipBaru: true,
              nik: true,
              jabatanNama: true,
              unorNama: true,
              golAkhirNama: true
            }
          },
          logTandaTangan: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { namaLengkap: true, role: true } }
            }
          }
        }
      })
    ]);

    const calculatedItems = items.map((item) => {
      let durasiTahun = null;
      let masaKontrak = null;
      if (item.tanggalMulai && item.tanggalSelesai) {
        try {
          const start = new Date(item.tanggalMulai);
          const end = new Date(item.tanggalSelesai);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
            const endInclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
            let years = endInclusive.getFullYear() - start.getFullYear();
            let months = endInclusive.getMonth() - start.getMonth();
            let days = endInclusive.getDate() - start.getDate();
            if (days < 0) months--;
            if (months < 0) {
              years--;
              months += 12;
            }
            durasiTahun = years;
            const parts = [];
            if (years > 0) parts.push(`${years} Tahun`);
            if (months > 0) parts.push(`${months} Bulan`);
            masaKontrak = parts.length > 0 ? parts.join(' ') : '1 Bulan';
          }
        } catch (_) {}
      }
      return {
        ...item,
        durasiTahun,
        masaKontrak
      };
    });

    return {
      data: calculatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  },

  async getMonitoringTteStats() {
    const [
      total,
      menungguPegawai,
      menungguKaban,
      menungguSekda,
      menungguBupati,
      selesai,
      ditolak
    ] = await Promise.all([
      prisma.usulanPerpanjangan.count({ where: { isDeleted: false, statusTte: { not: null } } }),
      prisma.usulanPerpanjangan.count({ where: { isDeleted: false, statusTte: 'MENUNGGU_TTE_PEGAWAI' } }),
      prisma.usulanPerpanjangan.count({ where: { isDeleted: false, statusTte: 'MENUNGGU_PARAF_KABAN' } }),
      prisma.usulanPerpanjangan.count({ where: { isDeleted: false, statusTte: 'MENUNGGU_PARAF_SEKDA' } }),
      prisma.usulanPerpanjangan.count({ where: { isDeleted: false, statusTte: 'MENUNGGU_TTE_BUPATI' } }),
      prisma.usulanPerpanjangan.count({ where: { isDeleted: false, statusTte: 'TTE_SELESAI' } }),
      prisma.usulanPerpanjangan.count({ where: { isDeleted: false, statusTte: 'DITOLAK' } })
    ]);

    return {
      total,
      menungguPegawai,
      menungguKaban,
      menungguSekda,
      menungguBupati,
      selesai,
      ditolak
    };
  },

  async findStatistikPejabat(userId, statusTteMenunggu) {
    const [antrianCount, riwayatSuksesCount, riwayatTolakCount, totalSelesaiPemda] = await Promise.all([
      prisma.usulanPerpanjangan.count({
        where: { isDeleted: false, statusTte: statusTteMenunggu }
      }),
      prisma.logTandaTangan.count({
        where: { userId, status: 'SUKSES' }
      }),
      prisma.logTandaTangan.count({
        where: { userId, status: 'DITOLAK' }
      }),
      prisma.usulanPerpanjangan.count({
        where: { isDeleted: false, statusTte: 'TTE_SELESAI' }
      })
    ]);

    return {
      antrianCount,
      riwayatSuksesCount,
      riwayatTolakCount,
      totalSelesaiPemda
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

  async findActivePejabatByJabatan(jabatan, excludeId = null) {
    return prisma.pejabatPenandatangan.findFirst({
      where: {
        jabatan,
        isActive: true,
        isDeleted: false,
        ...(excludeId ? { id: { not: excludeId } } : {})
      },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        user: { select: { id: true, email: true, username: true, namaLengkap: true } }
      }
    });
  },

  async findPejabatById(id) {
    return prisma.pejabatPenandatangan.findFirst({
      where: { id, isDeleted: false },
      select: { id: true, userId: true, jabatan: true, isActive: true }
    });
  },

  async findPejabatRecordByUserId(userId) {
    // Termasuk yang sudah soft-delete, karena userId bersifat @unique
    return prisma.pejabatPenandatangan.findUnique({
      where: { userId },
      select: { id: true, isDeleted: true }
    });
  },

  async findUserRoleById(userId) {
    return prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: { id: true, role: true }
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

      // 3. Bila TTE Selesai, tautkan dokumen final ke RiwayatKontrak.
      //    RiwayatKontrak sudah dibuat saat usulan di-APPROVE (lengkap dengan gaji, MK, golongan),
      //    jadi di sini cukup diperbarui. Buat baru hanya jika belum ada (fallback).
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

        const kontrakKe = usulan.kontrakKe !== null && usulan.kontrakKe !== undefined ? Number(usulan.kontrakKe) : null;

        const existingRiwayat = await tx.riwayatKontrak.findFirst({
          where: {
            dataP3kId: usulan.dataP3kId,
            isDeleted: false,
            ...(usulan.nomorKontrak ? { nomorKontrak: usulan.nomorKontrak } : {}),
            ...(kontrakKe !== null ? { kontrakKe } : {})
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true }
        });

        if (existingRiwayat) {
          if (arsipKontrakId) {
            await tx.riwayatKontrak.update({
              where: { id: existingRiwayat.id },
              data: { arsipKontrakId }
            });
          }
        } else {
          await tx.riwayatKontrak.create({
            data: {
              dataP3kId: usulan.dataP3kId,
              kontrakKe: kontrakKe !== null ? kontrakKe : 1,
              nomorKontrak: usulan.nomorKontrak || '',
              tanggalMulai: usulan.tanggalMulai,
              tanggalSelesai: usulan.tanggalSelesai,
              arsipKontrakId
            }
          });
        }
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
  },

  async applyResubmitTte({ usulanId, targetStatus, userId, catatan, ipAddress }) {
    return prisma.$transaction(async (tx) => {
      await tx.logTandaTangan.create({
        data: {
          usulanId,
          tahap: 'PENGAJUAN_ULANG',
          jenis: 'PARAF',
          userId,
          nik: '-',
          status: 'SUKSES',
          pesan: catatan
            ? `Pengajuan ulang dokumen oleh operator: ${catatan}`
            : 'Dokumen diajukan ulang ke antrean penandatangan setelah perbaikan',
          ipAddress
        }
      });

      const updated = await tx.usulanPerpanjangan.update({
        where: { id: usulanId },
        data: {
          statusTte: targetStatus,
          catatanTte: null
        },
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

      return updated;
    });
  },

  async applyResetTte({ usulanId, userId, alasanPembatalan, ipAddress, newPdfDraftUrl }) {
    return prisma.$transaction(async (tx) => {
      // 1. Catat log pembatalan resmi untuk rekam jejak audit
      await tx.logTandaTangan.create({
        data: {
          usulanId,
          tahap: 'PEMBATALAN_KONTRAK',
          jenis: 'REVOCATION',
          userId,
          nik: '-',
          status: 'DIBATALKAN',
          pesan: `Kontrak dibatalkan dan alur TTE di-reset: ${alasanPembatalan}`,
          ipAddress
        }
      });

      // 2. Ambil data usulan saat ini untuk perbaikan relasi riwayatKontrak
      const usulan = await tx.usulanPerpanjangan.findUnique({
        where: { id: usulanId },
        select: { dataP3kId: true, nomorKontrak: true, kontrakKe: true }
      });

      // 3. Reset status usulan ke APPROVED dan statusTte ke awal (MENUNGGU_PARAF_KABAN)
      const updated = await tx.usulanPerpanjangan.update({
        where: { id: usulanId },
        data: {
          status: 'APPROVED',
          statusTte: 'MENUNGGU_PARAF_KABAN',
          pdfDraftUrl: newPdfDraftUrl,
          pdfSignedUrl: null,
          finalFileUrl: null,
          tanggalTtd: null,
          catatanTte: `Dibatalkan & diulang dari awal: ${alasanPembatalan}`
        },
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

      // 4. Jika ada RiwayatKontrak yang terlanjur terhubung dengan arsipKontrak TTE final, lepas hubungannya
      if (usulan) {
        await tx.riwayatKontrak.updateMany({
          where: {
            dataP3kId: usulan.dataP3kId,
            ...(usulan.nomorKontrak ? { nomorKontrak: usulan.nomorKontrak } : {})
          },
          data: {
            arsipKontrakId: null
          }
        });
      }

      return updated;
    });
  }
};

