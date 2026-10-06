import prisma from '../../config/database.js';

export const verifikasiRepository = {
  async findInbox({ status, kategori, jenisPegawai, search, page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
      ...(status ? { status } : {}),
      ...(kategori ? { kategori } : {}),
      ...(jenisPegawai === 'PENUH_WAKTU' ? { dataP3kId: { not: null } } : {}),
      ...(jenisPegawai === 'PARUH_WAKTU' ? { dataP3kParuhWaktuId: { not: null } } : {})
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { nomorUsulan: { contains: q } },
        { dataP3k: { nama: { contains: q } } },
        { dataP3k: { nipBaru: { contains: q } } },
        { dataP3kParuhWaktu: { nama: { contains: q } } },
        { dataP3kParuhWaktu: { nipBaru: { contains: q } } }
      ];
    }

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
          verifikator: {
            select: { id: true, namaLengkap: true, username: true }
          },
          dataP3k: {
            select: {
              id: true,
              nipBaru: true,
              nama: true,
              gelarDepan: true,
              gelarBelakang: true,
              jabatanNama: true,
              unorNama: true
            }
          },
          dataP3kParuhWaktu: {
            select: {
              id: true,
              nipBaru: true,
              nama: true,
              gelarDepan: true,
              gelarBelakang: true,
              jabatanNama: true,
              unorNama: true
            }
          },
          lampiran: {
            where: { isDeleted: false },
            select: { id: true, namaFile: true, fileUrl: true, fileType: true, fileSize: true }
          }
        }
      })
    ]);

    // Format output dengan jenis pegawai
    const formatted = usulan.map(item => {
      const isPenuh = !!item.dataP3k;
      const pegawai = isPenuh ? item.dataP3k : item.dataP3kParuhWaktu;
      return {
        ...item,
        jenisPegawai: isPenuh ? 'PENUH_WAKTU' : 'PARUH_WAKTU',
        pegawai
      };
    });

    return {
      data: formatted,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async getStatistik() {
    const counts = await prisma.usulanPerbaikanData.groupBy({
      by: ['status'],
      where: { isDeleted: false },
      _count: { id: true }
    });

    const stat = {
      TOTAL: 0,
      DIAJUKAN: 0,
      DIPROSES: 0,
      PERLU_PERBAIKAN: 0,
      DISETUJUI: 0,
      DITOLAK: 0,
      DIBATALKAN: 0
    };

    counts.forEach(c => {
      if (stat[c.status] !== undefined) {
        stat[c.status] = c._count.id;
      }
      stat.TOTAL += c._count.id;
    });

    return stat;
  },

  async findById(id) {
    const item = await prisma.usulanPerbaikanData.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        nomorUsulan: true,
        dataP3kId: true,
        dataP3kParuhWaktuId: true,
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
        verifikator: {
          select: { id: true, namaLengkap: true, username: true }
        },
        dataP3k: {
          select: {
            id: true,
            nipBaru: true,
            nama: true,
            gelarDepan: true,
            gelarBelakang: true,
            jabatanNama: true,
            unorNama: true,
            nomorHp: true,
            email: true,
            alamat: true,
            statusPensiun: true
          }
        },
        dataP3kParuhWaktu: {
          select: {
            id: true,
            nipBaru: true,
            nama: true,
            gelarDepan: true,
            gelarBelakang: true,
            jabatanNama: true,
            unorNama: true,
            nomorHp: true,
            email: true,
            alamat: true,
            statusPensiun: true
          }
        },
        lampiran: {
          where: { isDeleted: false },
          select: { id: true, namaFile: true, fileUrl: true, fileType: true, fileSize: true }
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
              select: { namaLengkap: true, role: true }
            }
          }
        }
      }
    });

    if (!item) return null;

    const isPenuh = !!item.dataP3k;
    const pegawai = isPenuh ? item.dataP3k : item.dataP3kParuhWaktu;

    return {
      ...item,
      jenisPegawai: isPenuh ? 'PENUH_WAKTU' : 'PARUH_WAKTU',
      pegawai
    };
  },

  async updateStatus(id, { statusLama, statusBaru, catatan, verifikatorId, userId }) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.usulanPerbaikanData.update({
        where: { id },
        data: {
          status: statusBaru,
          catatanVerifikator: catatan,
          verifikatorId,
          tanggalVerifikasi: ['DISETUJUI', 'DITOLAK'].includes(statusBaru) ? new Date() : undefined,
          riwayatStatus: {
            create: {
              statusLama,
              statusBaru,
              catatan,
              userId
            }
          }
        },
        select: {
          id: true,
          nomorUsulan: true,
          status: true,
          catatanVerifikator: true
        }
      });
      return updated;
    });
  },

  async applyPersetujuan({ usulan, catatan, verifikatorId }) {
    return prisma.$transaction(async (tx) => {
      const { kategori, aksi, targetId, dataBaru, jenisPegawai, dataP3kId, dataP3kParuhWaktuId, lampiran } = usulan;
      const idPegawai = jenisPegawai === 'PENUH_WAKTU' ? dataP3kId : dataP3kParuhWaktuId;

      // 1. Eksekusi perubahan ke data target sesuai kategori
      if (kategori === 'DATA_UTAMA') {
        const updatePayload = {};
        if (dataBaru.nomorHp !== undefined) updatePayload.nomorHp = dataBaru.nomorHp;
        if (dataBaru.email !== undefined) updatePayload.email = dataBaru.email;
        if (dataBaru.alamat !== undefined) updatePayload.alamat = dataBaru.alamat;

        if (jenisPegawai === 'PENUH_WAKTU') {
          await tx.dataP3k.update({
            where: { id: idPegawai },
            data: updatePayload
          });
          if (dataBaru.email) {
            await tx.user.updateMany({
              where: { dataP3kId: idPegawai },
              data: { email: dataBaru.email }
            });
          }
        } else {
          await tx.dataP3kParuhWaktu.update({
            where: { id: idPegawai },
            data: updatePayload
          });
          if (dataBaru.email) {
            await tx.user.updateMany({
              where: { dataP3kParuhWaktuId: idPegawai },
              data: { email: dataBaru.email }
            });
          }
        }
      } else if (kategori === 'RIWAYAT_KELUARGA') {
        if (aksi === 'TAMBAH') {
          await tx.riwayatKeluarga.create({
            data: {
              ...(jenisPegawai === 'PENUH_WAKTU' ? { dataP3kId: idPegawai } : { dataP3kParuhWaktuId: idPegawai }),
              hubungan: dataBaru.hubungan,
              nama: dataBaru.nama,
              nik: dataBaru.nik || null,
              tempatLahir: dataBaru.tempatLahir || null,
              tanggalLahir: dataBaru.tanggalLahir || null,
              jenisKelamin: dataBaru.jenisKelamin || null,
              pekerjaan: dataBaru.pekerjaan || null,
              statusHidup: dataBaru.statusHidup !== undefined ? Boolean(dataBaru.statusHidup) : true,
              tanggalMenikah: dataBaru.tanggalMenikah || null,
              nomorAktaNikah: dataBaru.nomorAktaNikah || null,
              nomorAktaLahir: dataBaru.nomorAktaLahir || null,
              isTanggungan: dataBaru.isTanggungan !== undefined ? Boolean(dataBaru.isTanggungan) : false
            }
          });
        } else if (aksi === 'UBAH') {
          await tx.riwayatKeluarga.update({
            where: { id: targetId },
            data: {
              hubungan: dataBaru.hubungan,
              nama: dataBaru.nama,
              nik: dataBaru.nik || null,
              tempatLahir: dataBaru.tempatLahir || null,
              tanggalLahir: dataBaru.tanggalLahir || null,
              jenisKelamin: dataBaru.jenisKelamin || null,
              pekerjaan: dataBaru.pekerjaan || null,
              statusHidup: dataBaru.statusHidup !== undefined ? Boolean(dataBaru.statusHidup) : true,
              tanggalMenikah: dataBaru.tanggalMenikah || null,
              nomorAktaNikah: dataBaru.nomorAktaNikah || null,
              nomorAktaLahir: dataBaru.nomorAktaLahir || null,
              isTanggungan: dataBaru.isTanggungan !== undefined ? Boolean(dataBaru.isTanggungan) : false
            }
          });
        } else if (aksi === 'HAPUS') {
          await tx.riwayatKeluarga.update({
            where: { id: targetId },
            data: { isDeleted: true }
          });
        }
      } else if (kategori === 'RIWAYAT_KONTRAK') {
        let arsipKontrakId = null;
        if (lampiran && lampiran.length > 0) {
          const l = lampiran[0];
          const arsip = await tx.arsipKontrak.create({
            data: {
              namaFile: l.namaFile,
              fileUrl: l.fileUrl,
              fileType: l.fileType,
              fileSize: l.fileSize
            }
          });
          arsipKontrakId = arsip.id;
        }

        if (aksi === 'TAMBAH') {
          await tx.riwayatKontrak.create({
            data: {
              ...(jenisPegawai === 'PENUH_WAKTU' ? { dataP3kId: idPegawai } : { dataP3kParuhWaktuId: idPegawai }),
              kontrakKe: dataBaru.kontrakKe ? parseInt(dataBaru.kontrakKe, 10) : 1,
              nomorKontrak: dataBaru.nomorKontrak || '',
              tanggalMulai: dataBaru.tanggalMulai || '',
              tanggalSelesai: dataBaru.tanggalSelesai || '',
              arsipKontrakId
            }
          });
        } else if (aksi === 'UBAH') {
          const updateData = {
            kontrakKe: dataBaru.kontrakKe ? parseInt(dataBaru.kontrakKe, 10) : undefined,
            nomorKontrak: dataBaru.nomorKontrak,
            tanggalMulai: dataBaru.tanggalMulai,
            tanggalSelesai: dataBaru.tanggalSelesai
          };
          if (arsipKontrakId) updateData.arsipKontrakId = arsipKontrakId;

          await tx.riwayatKontrak.update({
            where: { id: targetId },
            data: updateData
          });
        }
      } else if (kategori === 'SK_PENGANGKATAN') {
        let arsipSkCpnsId = null;
        if (lampiran && lampiran.length > 0) {
          const l = lampiran[0];
          const nomorSk = dataBaru.nomorSkCpns || `SK-${Date.now()}`;
          const existingArsip = await tx.arsipSkCpns.findUnique({
            where: { nomorSk }
          });

          if (existingArsip) {
            await tx.arsipSkCpns.update({
              where: { id: existingArsip.id },
              data: {
                tanggalSk: dataBaru.tanggalSkCpns || null,
                fileUrl: l.fileUrl
              }
            });
            arsipSkCpnsId = existingArsip.id;
          } else {
            const arsip = await tx.arsipSkCpns.create({
              data: {
                nomorSk,
                tanggalSk: dataBaru.tanggalSkCpns || null,
                fileUrl: l.fileUrl
              }
            });
            arsipSkCpnsId = arsip.id;
          }
        }

        const updateData = {
          nomorSkCpns: dataBaru.nomorSkCpns,
          tanggalSkCpns: dataBaru.tanggalSkCpns,
          tmtCpns: dataBaru.tmtCpns
        };
        if (arsipSkCpnsId) updateData.arsipSkCpnsId = arsipSkCpnsId;

        if (jenisPegawai === 'PENUH_WAKTU') {
          await tx.dataP3k.update({
            where: { id: idPegawai },
            data: updateData
          });
        } else {
          await tx.dataP3kParuhWaktu.update({
            where: { id: idPegawai },
            data: updateData
          });
        }
      }

      // 2. Tandai usulan DISETUJUI
      const updatedUsulan = await tx.usulanPerbaikanData.update({
        where: { id: usulan.id },
        data: {
          status: 'DISETUJUI',
          catatanVerifikator: catatan || 'Disetujui oleh verifikator',
          verifikatorId,
          tanggalVerifikasi: new Date(),
          riwayatStatus: {
            create: {
              statusLama: usulan.status,
              statusBaru: 'DISETUJUI',
              catatan: catatan || 'Usulan perbaikan disetujui dan diterapkan ke data utama',
              userId: verifikatorId
            }
          }
        },
        select: {
          id: true,
          nomorUsulan: true,
          status: true,
          tanggalVerifikasi: true
        }
      });

      return updatedUsulan;
    });
  }
};
