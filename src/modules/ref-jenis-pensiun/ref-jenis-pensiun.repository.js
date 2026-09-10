import prisma from '../../config/database.js';

export const DEFAULT_JENIS_PENSIUN = [
  {
    kode: 'BUP',
    nama: 'Batas Usia Pensiun (BUP)',
    keterangan: 'Pensiun karena telah mencapai batas usia pensiun sesuai peraturan yang berlaku',
    isActive: true,
  },
  {
    kode: 'MENINGGAL',
    nama: 'Meninggal Dunia',
    keterangan: 'Pemberhentian karena pegawai PPPK meninggal dunia',
    isActive: true,
  },
  {
    kode: 'APS',
    nama: 'Atas Permintaan Sendiri (APS)',
    keterangan: 'Pemberhentian atas permohonan/kehendak sendiri dari pegawai yang bersangkutan',
    isActive: true,
  },
  {
    kode: 'UZUR',
    nama: 'Uzur / Sakit (Tidak Cakap Jasmani/Rohani)',
    keterangan: 'Pemberhentian karena tidak dapat menjalankan tugas akibat keadaan jasmani atau rohani',
    isActive: true,
  },
  {
    kode: 'PERAMPINGAN',
    nama: 'Perampingan Organisasi / Kebijakan Pemerintah',
    keterangan: 'Pemberhentian akibat adanya restrukturisasi organisasi atau kebijakan perampingan formasi',
    isActive: true,
  },
  {
    kode: 'LAINNYA',
    nama: 'Lain-lain / Diberhentikan dengan Hormat',
    keterangan: 'Pemberhentian dengan hormat karena alasan lain sesuai ketentuan peraturan perundang-undangan',
    isActive: true,
  },
];

export class RefJenisPensiunRepository {
  /**
   * Seed default jenis pensiun if table is empty
   */
  static async seedDefaultsIfEmpty() {
    const count = await prisma.refJenisPensiun.count({
      where: { isDeleted: false }
    });

    if (count === 0) {
      for (const item of DEFAULT_JENIS_PENSIUN) {
        await prisma.refJenisPensiun.create({
          data: {
            kode: item.kode,
            nama: item.nama,
            keterangan: item.keterangan,
            isActive: item.isActive,
            isDeleted: false,
          }
        });
      }
    }
  }

  static async findAll({ onlyActive = false, search = '' } = {}) {
    await this.seedDefaultsIfEmpty();

    const where = {
      isDeleted: false,
      ...(onlyActive ? { isActive: true } : {})
    };

    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { kode: { contains: search } },
        { keterangan: { contains: search } }
      ];
    }

    return await prisma.refJenisPensiun.findMany({
      where,
      select: {
        id: true,
        kode: true,
        nama: true,
        keterangan: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            dataP3k: {
              where: { isDeleted: false, statusPensiun: 'PENSIUN' }
            },
            dataP3kParuhWaktu: {
              where: { isDeleted: false, statusPensiun: 'PENSIUN' }
            }
          }
        }
      },
      orderBy: [
        { kode: 'asc' },
        { nama: 'asc' }
      ]
    });
  }

  static async findById(id) {
    return await prisma.refJenisPensiun.findFirst({
      where: {
        id,
        isDeleted: false
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        keterangan: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            dataP3k: {
              where: { isDeleted: false, statusPensiun: 'PENSIUN' }
            },
            dataP3kParuhWaktu: {
              where: { isDeleted: false, statusPensiun: 'PENSIUN' }
            }
          }
        }
      }
    });
  }

  static async findByKode(kode, excludeId = null) {
    if (!kode) return null;
    return await prisma.refJenisPensiun.findFirst({
      where: {
        kode: kode.trim().toUpperCase(),
        isDeleted: false,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      }
    });
  }

  static async create(data) {
    return await prisma.refJenisPensiun.create({
      data: {
        kode: data.kode ? data.kode.trim().toUpperCase() : null,
        nama: data.nama.trim(),
        keterangan: data.keterangan ? data.keterangan.trim() : null,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  }

  static async update(id, data) {
    const payload = {};
    if (data.kode !== undefined) payload.kode = data.kode ? data.kode.trim().toUpperCase() : null;
    if (data.nama !== undefined) payload.nama = data.nama.trim();
    if (data.keterangan !== undefined) payload.keterangan = data.keterangan ? data.keterangan.trim() : null;
    if (data.isActive !== undefined) payload.isActive = data.isActive;

    return await prisma.refJenisPensiun.update({
      where: { id },
      data: payload
    });
  }

  static async softDelete(id) {
    return await prisma.refJenisPensiun.update({
      where: { id },
      data: { isDeleted: true }
    });
  }
}
