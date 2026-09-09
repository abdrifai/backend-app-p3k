import prisma from '../../config/database.js';

export class MasalahPegawaiRepository {
  static async generateNomorKasus() {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `KASUS/${yearMonth}/`;

    const lastRecord = await prisma.masalahPegawai.findFirst({
      where: {
        nomorKasus: {
          startsWith: prefix
        }
      },
      orderBy: {
        nomorKasus: 'desc'
      },
      select: {
        nomorKasus: true
      }
    });

    let nextSeq = 1;
    if (lastRecord && lastRecord.nomorKasus) {
      const parts = lastRecord.nomorKasus.split('/');
      if (parts.length === 3) {
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) {
          nextSeq = parsed + 1;
        }
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  static async findAll(params = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      kategoriId,
      status,
      tingkatKeparahan,
      unorIndukId,
      dataP3kId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
      ...(kategoriId ? { kategoriId } : {}),
      ...(status ? { status } : {}),
      ...(tingkatKeparahan ? { tingkatKeparahan } : {}),
      ...(dataP3kId ? { dataP3kId } : {}),
      ...(unorIndukId ? { dataP3k: { unorIndukId } } : {}),
      ...(startDate || endDate
        ? {
            tanggalKejadian: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {})
            }
          }
        : {}),
      ...(search
        ? {
            OR: [
              { nomorKasus: { contains: search } },
              { judul: { contains: search } },
              { dataP3k: { nama: { contains: search } } },
              { dataP3k: { nipBaru: { contains: search } } },
              { dataP3k: { unorNama: { contains: search } } }
            ]
          }
        : {})
    };

    const [total, data] = await Promise.all([
      prisma.masalahPegawai.count({ where }),
      prisma.masalahPegawai.findMany({
        where,
        select: {
          id: true,
          nomorKasus: true,
          judul: true,
          tanggalKejadian: true,
          tingkatKeparahan: true,
          status: true,
          deskripsi: true,
          ringkasanMasalah: true,
          tindakLanjut: true,
          catatanPenyelesaian: true,
          tanggalSelesai: true,
          createdAt: true,
          updatedAt: true,
          dataP3k: {
            select: {
              id: true,
              nipBaru: true,
              nama: true,
              jabatanNama: true,
              golAkhirNama: true,
              unorNama: true,
              unorInduk: {
                select: {
                  id: true,
                  nama: true
                }
              }
            }
          },
          kategori: {
            select: {
              id: true,
              kode: true,
              nama: true,
              warnaBadge: true
            }
          },
          createdBy: {
            select: {
              id: true,
              namaLengkap: true,
              username: true
            }
          },
          _count: {
            select: {
              lampiran: { where: { isDeleted: false } },
              riwayatPenanganan: { where: { isDeleted: false } }
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async findById(id) {
    return await prisma.masalahPegawai.findFirst({
      where: {
        id,
        isDeleted: false
      },
      select: {
        id: true,
        nomorKasus: true,
        judul: true,
        tanggalKejadian: true,
        tingkatKeparahan: true,
        status: true,
        deskripsi: true,
        ringkasanMasalah: true,
        tindakLanjut: true,
        catatanPenyelesaian: true,
        tanggalSelesai: true,
        createdAt: true,
        updatedAt: true,
        dataP3kId: true,
        kategoriId: true,
        createdById: true,
        dataP3k: {
          select: {
            id: true,
            nipBaru: true,
            nama: true,
            jabatanNama: true,
            golAkhirNama: true,
            unorNama: true,
            nomorHp: true,
            email: true,
            unorInduk: {
              select: {
                id: true,
                nama: true
              }
            }
          }
        },
        kategori: {
          select: {
            id: true,
            kode: true,
            nama: true,
            warnaBadge: true
          }
        },
        createdBy: {
          select: {
            id: true,
            namaLengkap: true,
            username: true
          }
        },
        lampiran: {
          where: { isDeleted: false },
          select: {
            id: true,
            namaFile: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            keterangan: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        riwayatPenanganan: {
          where: { isDeleted: false },
          select: {
            id: true,
            statusSebelumnya: true,
            statusBaru: true,
            tindakan: true,
            keterangan: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                namaLengkap: true,
                username: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  static async findByDataP3kId(dataP3kId) {
    return await prisma.masalahPegawai.findMany({
      where: {
        dataP3kId,
        isDeleted: false
      },
      select: {
        id: true,
        nomorKasus: true,
        judul: true,
        tanggalKejadian: true,
        tingkatKeparahan: true,
        status: true,
        deskripsi: true,
        ringkasanMasalah: true,
        tindakLanjut: true,
        catatanPenyelesaian: true,
        tanggalSelesai: true,
        createdAt: true,
        kategori: {
          select: {
            id: true,
            kode: true,
            nama: true,
            warnaBadge: true
          }
        },
        createdBy: {
          select: {
            id: true,
            namaLengkap: true
          }
        },
        lampiran: {
          where: { isDeleted: false },
          select: {
            id: true,
            namaFile: true,
            fileUrl: true,
            fileType: true
          }
        },
        riwayatPenanganan: {
          where: { isDeleted: false },
          select: {
            id: true,
            statusSebelumnya: true,
            statusBaru: true,
            tindakan: true,
            keterangan: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                namaLengkap: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getRekapStats() {
    const whereBase = { isDeleted: false };

    const [total, byStatus, byKategori, byKeparahan] = await Promise.all([
      prisma.masalahPegawai.count({ where: whereBase }),
      prisma.masalahPegawai.groupBy({
        by: ['status'],
        where: whereBase,
        _count: { id: true }
      }),
      prisma.kategoriMasalah.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          kode: true,
          nama: true,
          warnaBadge: true,
          _count: {
            select: {
              masalahPegawai: {
                where: { isDeleted: false }
              }
            }
          }
        }
      }),
      prisma.masalahPegawai.groupBy({
        by: ['tingkatKeparahan'],
        where: whereBase,
        _count: { id: true }
      })
    ]);

    const statusCounts = {
      OPEN: 0,
      INVESTIGASI: 0,
      TINDAK_LANJUT: 0,
      SELESAI: 0,
      DIBATALKAN: 0
    };

    byStatus.forEach((item) => {
      statusCounts[item.status] = item._count.id;
    });

    const keparahanCounts = {
      RINGAN: 0,
      SEDANG: 0,
      BERAT: 0,
      KRITIS: 0
    };

    byKeparahan.forEach((item) => {
      keparahanCounts[item.tingkatKeparahan] = item._count.id;
    });

    return {
      total,
      statusCounts,
      keparahanCounts,
      kategoriStats: byKategori.map((k) => ({
        id: k.id,
        kode: k.kode,
        nama: k.nama,
        warnaBadge: k.warnaBadge,
        totalKasus: k._count.masalahPegawai
      }))
    };
  }

  static async create(data, files = [], userId) {
    let nomorKasus = (data.nomorKasus || '').trim();
    if (!nomorKasus) {
      nomorKasus = await this.generateNomorKasus();
    } else {
      // If provided, verify uniqueness
      const existing = await prisma.masalahPegawai.findFirst({
        where: { nomorKasus, isDeleted: false }
      });
      if (existing) {
        const err = new Error(`Nomor kasus "${nomorKasus}" sudah digunakan. Silakan gunakan nomor lain.`);
        err.statusCode = 400;
        throw err;
      }
    }

    return await prisma.$transaction(async (tx) => {
      const created = await tx.masalahPegawai.create({
        data: {
          nomorKasus,
          dataP3kId: data.dataP3kId,
          kategoriId: data.kategoriId,
          judul: data.judul,
          tanggalKejadian: data.tanggalKejadian ? new Date(data.tanggalKejadian) : null,
          tingkatKeparahan: data.tingkatKeparahan || 'SEDANG',
          status: data.status || 'OPEN',
          deskripsi: data.deskripsi,
          ringkasanMasalah: data.ringkasanMasalah || null,
          tindakLanjut: data.tindakLanjut || null,
          catatanPenyelesaian: data.catatanPenyelesaian || null,
          tanggalSelesai: data.tanggalSelesai ? new Date(data.tanggalSelesai) : null,
          createdById: userId
        }
      });

      // Insert initial history
      await tx.riwayatPenangananMasalah.create({
        data: {
          masalahPegawaiId: created.id,
          statusSebelumnya: null,
          statusBaru: created.status,
          tindakan: 'Pencatatan Masalah Awal',
          keterangan: 'Catatan masalah pertama kali didokumentasikan di sistem.',
          userId
        }
      });

      // Insert attachments if any
      if (files && files.length > 0) {
        const lampiranData = files.map((file) => ({
          masalahPegawaiId: created.id,
          namaFile: file.originalname,
          fileUrl: `/uploads/masalah-lampiran/${file.filename}`,
          fileType: file.mimetype,
          fileSize: file.size,
          keterangan: 'Lampiran berkas kasus'
        }));

        await tx.lampiranMasalah.createMany({
          data: lampiranData
        });
      }

      return created;
    });
  }

  static async update(id, data, files = [], userId) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.masalahPegawai.findUnique({
        where: { id }
      });

      if (!existing) {
        const err = new Error('Data masalah pegawai tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }

      let nomorKasus = data.nomorKasus ? data.nomorKasus.trim() : undefined;
      if (nomorKasus && nomorKasus !== existing.nomorKasus) {
        const duplicate = await tx.masalahPegawai.findFirst({
          where: { nomorKasus, isDeleted: false, NOT: { id } }
        });
        if (duplicate) {
          const err = new Error(`Nomor kasus "${nomorKasus}" sudah digunakan.`);
          err.statusCode = 400;
          throw err;
        }
      }

      const updatePayload = {
        ...(nomorKasus ? { nomorKasus } : {}),
        ...(data.kategoriId ? { kategoriId: data.kategoriId } : {}),
        ...(data.judul ? { judul: data.judul } : {}),
        ...(data.tanggalKejadian !== undefined
          ? { tanggalKejadian: data.tanggalKejadian ? new Date(data.tanggalKejadian) : null }
          : {}),
        ...(data.tingkatKeparahan ? { tingkatKeparahan: data.tingkatKeparahan } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.deskripsi ? { deskripsi: data.deskripsi } : {}),
        ...(data.ringkasanMasalah !== undefined ? { ringkasanMasalah: data.ringkasanMasalah } : {}),
        ...(data.tindakLanjut !== undefined ? { tindakLanjut: data.tindakLanjut } : {}),
        ...(data.catatanPenyelesaian !== undefined ? { catatanPenyelesaian: data.catatanPenyelesaian } : {}),
        ...(data.tanggalSelesai !== undefined
          ? { tanggalSelesai: data.tanggalSelesai ? new Date(data.tanggalSelesai) : null }
          : {})
      };

      const updated = await tx.masalahPegawai.update({
        where: { id },
        data: updatePayload
      });

      // If status changed, record timeline
      if (data.status && data.status !== existing.status) {
        await tx.riwayatPenangananMasalah.create({
          data: {
            masalahPegawaiId: id,
            statusSebelumnya: existing.status,
            statusBaru: data.status,
            tindakan: `Perubahan Status menjadi ${data.status}`,
            keterangan: data.catatanPenyelesaian || data.tindakLanjut || 'Status kasus diperbarui.',
            userId
          }
        });
      }

      // Add extra files if uploaded
      if (files && files.length > 0) {
        const lampiranData = files.map((file) => ({
          masalahPegawaiId: id,
          namaFile: file.originalname,
          fileUrl: `/uploads/masalah-lampiran/${file.filename}`,
          fileType: file.mimetype,
          fileSize: file.size,
          keterangan: 'Lampiran tambahan'
        }));

        await tx.lampiranMasalah.createMany({
          data: lampiranData
        });
      }

      return updated;
    });
  }

  static async addTindakLanjut(id, data, userId) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.masalahPegawai.findUnique({
        where: { id }
      });

      if (!existing) {
        const err = new Error('Data masalah pegawai tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }

      // Update status in MasalahPegawai if new status provided
      const updateData = {
        status: data.statusBaru,
        tindakLanjut: data.tindakan,
        ...(data.statusBaru === 'SELESAI'
          ? {
              tanggalSelesai: data.tanggalSelesai ? new Date(data.tanggalSelesai) : new Date(),
              catatanPenyelesaian: data.keterangan || existing.catatanPenyelesaian
            }
          : {})
      };

      await tx.masalahPegawai.update({
        where: { id },
        data: updateData
      });

      // Insert timeline entry
      const history = await tx.riwayatPenangananMasalah.create({
        data: {
          masalahPegawaiId: id,
          statusSebelumnya: existing.status,
          statusBaru: data.statusBaru,
          tindakan: data.tindakan,
          keterangan: data.keterangan || null,
          userId
        }
      });

      return history;
    });
  }

  static async softDelete(id) {
    return await prisma.masalahPegawai.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  static async deleteLampiran(lampiranId) {
    return await prisma.lampiranMasalah.update({
      where: { id: lampiranId },
      data: { isDeleted: true }
    });
  }
}
