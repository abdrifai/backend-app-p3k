import prisma from '../../config/database.js';

export class PemberhentianRepository {
  /**
   * Cari pegawai P3K (Penuh Waktu atau Paruh Waktu) berdasarkan nipBaru
   */
  static async findByNipBaru(nipBaru) {
    const p3k = await prisma.dataP3k.findFirst({
      where: { nipBaru, isDeleted: false },
      include: { arsipSkPensiun: true, jenisPensiun: true }
    });

    if (p3k) return { ...p3k, kategoriPegawai: 'PENUH_WAKTU' };

    const paruhWaktu = await prisma.dataP3kParuhWaktu.findFirst({
      where: { nipBaru, isDeleted: false },
      include: { arsipSkPensiun: true, jenisPensiun: true }
    });

    if (paruhWaktu) return { ...paruhWaktu, kategoriPegawai: 'PARUH_WAKTU' };

    return null;
  }

  /**
   * Set status pegawai menjadi PENSIUN / PEMBERHENTIAN
   */
  static async setPemberhentian({ nipBaru, nomorSk, tanggalSk, fileUrl, jenisPensiunId }) {
    return prisma.$transaction(async (tx) => {
      const trimmedNomorSk = nomorSk ? nomorSk.trim() : '';
      const trimmedTanggalSk = tanggalSk ? tanggalSk.trim() : null;

      // Check if employee exists in DataP3k or DataP3kParuhWaktu
      const p3k = await tx.dataP3k.findFirst({
        where: { nipBaru, isDeleted: false }
      });
      const paruhWaktu = !p3k ? await tx.dataP3kParuhWaktu.findFirst({
        where: { nipBaru, isDeleted: false }
      }) : null;

      if (!p3k && !paruhWaktu) {
        const error = new Error('Data Pegawai PPPK tidak ditemukan');
        error.status = 404;
        throw error;
      }

      // 1. Check if ArsipSkPensiun with nomorSk already exists
      let arsipSk = await tx.arsipSkPensiun.findUnique({
        where: { nomorSk: trimmedNomorSk }
      });

      if (arsipSk) {
        const updateData = { isDeleted: false };
        if (trimmedTanggalSk) updateData.tanggalSk = trimmedTanggalSk;
        if (fileUrl) updateData.fileUrl = fileUrl;

        arsipSk = await tx.arsipSkPensiun.update({
          where: { id: arsipSk.id },
          data: updateData
        });
      } else {
        arsipSk = await tx.arsipSkPensiun.create({
          data: {
            nomorSk: trimmedNomorSk,
            tanggalSk: trimmedTanggalSk || null,
            fileUrl: fileUrl || null
          }
        });
      }

      // 2. Update status and link to ArsipSkPensiun & JenisPensiun
      const p3kData = {
        statusPensiun: 'PENSIUN',
        arsipSkPensiunId: arsipSk.id,
      };
      if (jenisPensiunId !== undefined) {
        p3kData.jenisPensiunId = jenisPensiunId || null;
      }

      if (p3k) {
        const res = await tx.dataP3k.update({
          where: { nipBaru },
          data: p3kData,
          include: { arsipSkPensiun: true, jenisPensiun: true }
        });
        return { ...res, kategoriPegawai: 'PENUH_WAKTU' };
      } else {
        const res = await tx.dataP3kParuhWaktu.update({
          where: { nipBaru },
          data: p3kData,
          include: { arsipSkPensiun: true, jenisPensiun: true }
        });
        return { ...res, kategoriPegawai: 'PARUH_WAKTU' };
      }
    });
  }
  static setPensiun = this.setPemberhentian;

  /**
   * Ambil daftar semua pegawai yang berstatus PENSIUN / PEMBERHENTIAN
   */
  static async findAllPemberhentian({ skip, take, search, jenisPensiunId, kategori = 'ALL' }) {
    const where = { AND: [{ isDeleted: false }, { statusPensiun: 'PENSIUN' }] };

    if (jenisPensiunId) {
      where.AND.push({ jenisPensiunId });
    }

    if (search) {
      where.AND.push({
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } },
          { unorNama: { contains: search } }
        ]
      });
    }

    if (kategori === 'PENUH_WAKTU') {
      const [data, total] = await Promise.all([
        prisma.dataP3k.findMany({
          where,
          skip,
          take,
          include: {
            arsipSkPensiun: true,
            jenisPensiun: { select: { id: true, kode: true, nama: true } }
          },
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.dataP3k.count({ where })
      ]);
      return {
        data: data.map(d => ({ ...d, kategoriPegawai: 'PENUH_WAKTU' })),
        total
      };
    }

    if (kategori === 'PARUH_WAKTU') {
      const [data, total] = await Promise.all([
        prisma.dataP3kParuhWaktu.findMany({
          where,
          skip,
          take,
          include: {
            arsipSkPensiun: true,
            jenisPensiun: { select: { id: true, kode: true, nama: true } }
          },
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.dataP3kParuhWaktu.count({ where })
      ]);
      return {
        data: data.map(d => ({ ...d, kategoriPegawai: 'PARUH_WAKTU' })),
        total
      };
    }

    // ALL (Combined)
    const [totalP3k, totalParuh] = await Promise.all([
      prisma.dataP3k.count({ where }),
      prisma.dataP3kParuhWaktu.count({ where })
    ]);
    const total = totalP3k + totalParuh;

    const [dataP3k, dataParuh] = await Promise.all([
      prisma.dataP3k.findMany({
        where,
        take: skip + take,
        include: {
          arsipSkPensiun: true,
          jenisPensiun: { select: { id: true, kode: true, nama: true } }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.dataP3kParuhWaktu.findMany({
        where,
        take: skip + take,
        include: {
          arsipSkPensiun: true,
          jenisPensiun: { select: { id: true, kode: true, nama: true } }
        },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    const combined = [
      ...dataP3k.map(d => ({ ...d, kategoriPegawai: 'PENUH_WAKTU' })),
      ...dataParuh.map(d => ({ ...d, kategoriPegawai: 'PARUH_WAKTU' }))
    ].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    return {
      data: combined.slice(skip, skip + take),
      total
    };
  }
  static findAllPensiun = this.findAllPemberhentian;

  /**
   * Perbarui data SK & Jenis Pemberhentian
   */
  static async updatePemberhentian({ nipBaru, nomorSk, tanggalSk, fileUrl, jenisPensiunId }) {
    return prisma.$transaction(async (tx) => {
      const p3k = await tx.dataP3k.findUnique({
        where: { nipBaru },
        select: { id: true, arsipSkPensiunId: true }
      });
      const paruhWaktu = !p3k ? await tx.dataP3kParuhWaktu.findUnique({
        where: { nipBaru },
        select: { id: true, arsipSkPensiunId: true }
      }) : null;

      if (!p3k && !paruhWaktu) {
        const error = new Error('Data Pegawai PPPK tidak ditemukan');
        error.status = 404;
        throw error;
      }

      const targetModel = p3k ? tx.dataP3k : tx.dataP3kParuhWaktu;
      const currentEntity = p3k || paruhWaktu;

      // Update jenisPensiunId if provided
      if (jenisPensiunId !== undefined) {
        await targetModel.update({
          where: { nipBaru },
          data: { jenisPensiunId: jenisPensiunId || null }
        });
      }

      // Find if current arsip exists
      let currentArsip = null;
      if (currentEntity.arsipSkPensiunId) {
        currentArsip = await tx.arsipSkPensiun.findUnique({
          where: { id: currentEntity.arsipSkPensiunId }
        });
      }

      const trimmedNomorSk = nomorSk !== undefined && nomorSk !== null ? nomorSk.trim() : null;
      const trimmedTanggalSk = tanggalSk !== undefined && tanggalSk !== null ? tanggalSk.trim() : null;

      // Scenario 1: User has no existing valid arsip in DB
      if (!currentArsip) {
        if (!trimmedNomorSk) {
          const res = await targetModel.findUnique({
            where: { nipBaru },
            include: { arsipSkPensiun: true, jenisPensiun: true }
          });
          return { ...res, kategoriPegawai: p3k ? 'PENUH_WAKTU' : 'PARUH_WAKTU' };
        }

        let targetArsip = await tx.arsipSkPensiun.findUnique({
          where: { nomorSk: trimmedNomorSk }
        });

        if (targetArsip) {
          const updateData = { isDeleted: false };
          if (trimmedTanggalSk) updateData.tanggalSk = trimmedTanggalSk;
          if (fileUrl) updateData.fileUrl = fileUrl;

          targetArsip = await tx.arsipSkPensiun.update({
            where: { id: targetArsip.id },
            data: updateData
          });
        } else {
          targetArsip = await tx.arsipSkPensiun.create({
            data: {
              nomorSk: trimmedNomorSk,
              tanggalSk: trimmedTanggalSk || null,
              fileUrl: fileUrl || null
            }
          });
        }

        const res = await targetModel.update({
          where: { nipBaru },
          data: { arsipSkPensiunId: targetArsip.id },
          include: { arsipSkPensiun: true, jenisPensiun: true }
        });
        return { ...res, kategoriPegawai: p3k ? 'PENUH_WAKTU' : 'PARUH_WAKTU' };
      }

      // Scenario 2: User has an existing valid arsip
      const isNomorSkChanging = trimmedNomorSk && trimmedNomorSk !== currentArsip.nomorSk;

      if (isNomorSkChanging) {
        const [countUsingP3k, countUsingParuh] = await Promise.all([
          tx.dataP3k.count({ where: { arsipSkPensiunId: currentArsip.id } }),
          tx.dataP3kParuhWaktu.count({ where: { arsipSkPensiunId: currentArsip.id } })
        ]);
        const countUsingCurrent = countUsingP3k + countUsingParuh;

        let targetArsip = await tx.arsipSkPensiun.findUnique({
          where: { nomorSk: trimmedNomorSk }
        });

        if (targetArsip) {
          const updateData = { isDeleted: false };
          if (trimmedTanggalSk) updateData.tanggalSk = trimmedTanggalSk;
          if (fileUrl) updateData.fileUrl = fileUrl;

          targetArsip = await tx.arsipSkPensiun.update({
            where: { id: targetArsip.id },
            data: updateData
          });

          await targetModel.update({
            where: { nipBaru },
            data: { arsipSkPensiunId: targetArsip.id }
          });

          if (countUsingCurrent <= 1 && currentArsip.id !== targetArsip.id) {
            await tx.arsipSkPensiun.update({
              where: { id: currentArsip.id },
              data: { isDeleted: true }
            });
          }
        } else {
          if (countUsingCurrent <= 1) {
            const updateData = { nomorSk: trimmedNomorSk };
            if (trimmedTanggalSk !== null && trimmedTanggalSk !== '') updateData.tanggalSk = trimmedTanggalSk;
            if (fileUrl) updateData.fileUrl = fileUrl;

            await tx.arsipSkPensiun.update({
              where: { id: currentArsip.id },
              data: updateData
            });
          } else {
            const newArsip = await tx.arsipSkPensiun.create({
              data: {
                nomorSk: trimmedNomorSk,
                tanggalSk: trimmedTanggalSk || currentArsip.tanggalSk,
                fileUrl: fileUrl || currentArsip.fileUrl
              }
            });

            await targetModel.update({
              where: { nipBaru },
              data: { arsipSkPensiunId: newArsip.id }
            });
          }
        }
      } else {
        const updateData = {};
        if (trimmedTanggalSk !== null && trimmedTanggalSk !== '') {
          updateData.tanggalSk = trimmedTanggalSk;
        }
        if (fileUrl) {
          updateData.fileUrl = fileUrl;
        }

        if (Object.keys(updateData).length > 0) {
          await tx.arsipSkPensiun.update({
            where: { id: currentArsip.id },
            data: updateData
          });
        }
      }

      const res = await targetModel.findUnique({
        where: { nipBaru },
        include: { arsipSkPensiun: true, jenisPensiun: true }
      });
      return { ...res, kategoriPegawai: p3k ? 'PENUH_WAKTU' : 'PARUH_WAKTU' };
    });
  }
  static updatePensiun = this.updatePemberhentian;

  /**
   * Batalkan status pensiun / kembalikan ke AKTIF
   */
  static async revertPemberhentian(nipBaru) {
    return prisma.$transaction(async (tx) => {
      const p3k = await tx.dataP3k.findUnique({
        where: { nipBaru },
        select: { arsipSkPensiunId: true }
      });
      const paruhWaktu = !p3k ? await tx.dataP3kParuhWaktu.findUnique({
        where: { nipBaru },
        select: { arsipSkPensiunId: true }
      }) : null;

      if (!p3k && !paruhWaktu) {
        const error = new Error('Data Pegawai PPPK tidak ditemukan');
        error.status = 404;
        throw error;
      }

      const targetModel = p3k ? tx.dataP3k : tx.dataP3kParuhWaktu;
      const arsipSkPensiunId = (p3k || paruhWaktu)?.arsipSkPensiunId;

      const updated = await targetModel.update({
        where: { nipBaru },
        data: {
          statusPensiun: 'AKTIF',
          arsipSkPensiunId: null,
          jenisPensiunId: null
        }
      });

      if (arsipSkPensiunId) {
        const arsip = await tx.arsipSkPensiun.findUnique({
          where: { id: arsipSkPensiunId }
        });
        if (arsip) {
          const [countP3k, countParuh] = await Promise.all([
            tx.dataP3k.count({
              where: { arsipSkPensiunId }
            }),
            tx.dataP3kParuhWaktu.count({
              where: { arsipSkPensiunId }
            })
          ]);
          if (countP3k + countParuh === 0) {
            await tx.arsipSkPensiun.update({
              where: { id: arsipSkPensiunId },
              data: { isDeleted: true }
            });
          }
        }
      }

      return { ...updated, kategoriPegawai: p3k ? 'PENUH_WAKTU' : 'PARUH_WAKTU' };
    });
  }
  static revertPensiun = this.revertPemberhentian;
}
