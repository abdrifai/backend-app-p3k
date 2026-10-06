import prisma from '../../config/database.js';

export const perbaikanRepository = {
  async generateNomorUsulan() {
    const year = new Date().getFullYear();
    const prefix = `PRB-${year}-`;
    const lastUsulan = await prisma.usulanPerbaikanData.findFirst({
      where: {
        nomorUsulan: { startsWith: prefix }
      },
      orderBy: { nomorUsulan: 'desc' },
      select: { nomorUsulan: true }
    });

    let seq = 1;
    if (lastUsulan && lastUsulan.nomorUsulan) {
      const parts = lastUsulan.nomorUsulan.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }
    }
    return `${prefix}${String(seq).padStart(6, '0')}`;
  },

  async findManyByPegawai({ dataP3kId, dataP3kParuhWaktuId, status, kategori, page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;
    const where = {
      isDeleted: false,
      ...(dataP3kId ? { dataP3kId } : { dataP3kParuhWaktuId }),
      ...(status ? { status } : {}),
      ...(kategori ? { kategori } : {})
    };

    const [total, usulan] = await Promise.all([
      prisma.usulanPerbaikanData.count({ where }),
      prisma.usulanPerbaikanData.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nomorUsulan: true,
          kategori: true,
          aksi: true,
          targetId: true,
          dataLama: true,
          dataBaru: true,
          alasan: true,
          status: true,
          catatanVerifikator: true,
          tanggalVerifikasi: true,
          createdAt: true,
          updatedAt: true,
          lampiran: {
            where: { isDeleted: false },
            select: {
              id: true,
              namaFile: true,
              fileUrl: true,
              fileType: true,
              fileSize: true
            }
          }
        }
      })
    ]);

    return {
      data: usulan,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async findByIdAndPegawai(id, { dataP3kId, dataP3kParuhWaktuId }) {
    const where = {
      id,
      isDeleted: false,
      ...(dataP3kId ? { dataP3kId } : { dataP3kParuhWaktuId })
    };

    return prisma.usulanPerbaikanData.findFirst({
      where,
      select: {
        id: true,
        nomorUsulan: true,
        kategori: true,
        aksi: true,
        targetId: true,
        dataLama: true,
        dataBaru: true,
        alasan: true,
        status: true,
        catatanVerifikator: true,
        tanggalVerifikasi: true,
        createdAt: true,
        updatedAt: true,
        lampiran: {
          where: { isDeleted: false },
          select: {
            id: true,
            namaFile: true,
            fileUrl: true,
            fileType: true,
            fileSize: true
          }
        },
        riwayatStatus: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            statusLama: true,
            statusBaru: true,
            catatan: true,
            createdAt: true,
            user: {
              select: {
                namaLengkap: true,
                role: true
              }
            }
          }
        }
      }
    });
  },

  async countActivePending({ dataP3kId, dataP3kParuhWaktuId, kategori, targetId }) {
    return prisma.usulanPerbaikanData.count({
      where: {
        isDeleted: false,
        ...(dataP3kId ? { dataP3kId } : { dataP3kParuhWaktuId }),
        kategori,
        targetId: targetId || null,
        status: {
          in: ['DIAJUKAN', 'DIPROSES', 'PERLU_PERBAIKAN']
        }
      }
    });
  },

  async getDataLama({ jenisPegawai, idPegawai, kategori, targetId }) {
    if (kategori === 'DATA_UTAMA') {
      if (jenisPegawai === 'PENUH_WAKTU') {
        const p = await prisma.dataP3k.findUnique({
          where: { id: idPegawai },
          select: { nomorHp: true, email: true, alamat: true }
        });
        return p || null;
      } else {
        const p = await prisma.dataP3kParuhWaktu.findUnique({
          where: { id: idPegawai },
          select: { nomorHp: true, email: true, alamat: true }
        });
        return p || null;
      }
    }

    if (kategori === 'RIWAYAT_KELUARGA') {
      if (!targetId) return null;
      const k = await prisma.riwayatKeluarga.findFirst({
        where: {
          id: targetId,
          isDeleted: false,
          ...(jenisPegawai === 'PENUH_WAKTU' ? { dataP3kId: idPegawai } : { dataP3kParuhWaktuId: idPegawai })
        },
        select: {
          id: true,
          hubungan: true,
          nama: true,
          nik: true,
          tempatLahir: true,
          tanggalLahir: true,
          jenisKelamin: true,
          pekerjaan: true,
          statusHidup: true,
          tanggalMenikah: true,
          nomorAktaNikah: true,
          nomorAktaLahir: true,
          isTanggungan: true
        }
      });
      return k || null;
    }

    if (kategori === 'RIWAYAT_KONTRAK') {
      if (!targetId) return null;
      const c = await prisma.riwayatKontrak.findFirst({
        where: {
          id: targetId,
          isDeleted: false,
          ...(jenisPegawai === 'PENUH_WAKTU' ? { dataP3kId: idPegawai } : { dataP3kParuhWaktuId: idPegawai })
        },
        select: {
          id: true,
          kontrakKe: true,
          nomorKontrak: true,
          tanggalMulai: true,
          tanggalSelesai: true
        }
      });
      return c || null;
    }

    if (kategori === 'SK_PENGANGKATAN') {
      if (jenisPegawai === 'PENUH_WAKTU') {
        const p = await prisma.dataP3k.findUnique({
          where: { id: idPegawai },
          select: { nomorSkCpns: true, tanggalSkCpns: true, tmtCpns: true }
        });
        return p || null;
      } else {
        const p = await prisma.dataP3kParuhWaktu.findUnique({
          where: { id: idPegawai },
          select: { nomorSkCpns: true, tanggalSkCpns: true, tmtCpns: true }
        });
        return p || null;
      }
    }

    return null;
  },

  async createUsulan({ data, lampiranList = [], userId }) {
    return prisma.$transaction(async (tx) => {
      const usulan = await tx.usulanPerbaikanData.create({
        data: {
          ...data,
          lampiran: lampiranList.length > 0 ? {
            create: lampiranList.map(l => ({
              namaFile: l.namaFile,
              fileUrl: l.fileUrl,
              fileType: l.fileType,
              fileSize: l.fileSize
            }))
          } : undefined,
          riwayatStatus: {
            create: {
              statusLama: null,
              statusBaru: 'DIAJUKAN',
              catatan: 'Usulan perbaikan diajukan oleh pegawai',
              userId
            }
          }
        },
        select: {
          id: true,
          nomorUsulan: true,
          kategori: true,
          aksi: true,
          status: true,
          createdAt: true
        }
      });

      return usulan;
    });
  },

  async updateRevisi(id, { dataBaru, alasan, lampiranList = [], userId }) {
    return prisma.$transaction(async (tx) => {
      if (lampiranList.length > 0) {
        await tx.lampiranPerbaikan.createMany({
          data: lampiranList.map(l => ({
            usulanId: id,
            namaFile: l.namaFile,
            fileUrl: l.fileUrl,
            fileType: l.fileType,
            fileSize: l.fileSize
          }))
        });
      }

      const updated = await tx.usulanPerbaikanData.update({
        where: { id },
        data: {
          dataBaru,
          alasan,
          status: 'DIAJUKAN',
          riwayatStatus: {
            create: {
              statusLama: 'PERLU_PERBAIKAN',
              statusBaru: 'DIAJUKAN',
              catatan: `Revisi diajukan oleh pegawai: ${alasan}`,
              userId
            }
          }
        },
        select: {
          id: true,
          nomorUsulan: true,
          status: true,
          updatedAt: true
        }
      });

      return updated;
    });
  },

  async cancelUsulan(id, userId) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.usulanPerbaikanData.update({
        where: { id },
        data: {
          status: 'DIBATALKAN',
          riwayatStatus: {
            create: {
              statusLama: 'DIAJUKAN',
              statusBaru: 'DIBATALKAN',
              catatan: 'Usulan dibatalkan oleh pegawai',
              userId
            }
          }
        },
        select: {
          id: true,
          nomorUsulan: true,
          status: true
        }
      });
      return updated;
    });
  }
};
