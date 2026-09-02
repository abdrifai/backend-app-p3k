import prisma from '../../config/database.js';

export class RefUnorRepository {
  static async findAll({ skip = 0, take = 10, search = '', parentId = undefined, level = undefined, isIndukOnly = false }) {
    let where = { isDeleted: false };
    if (search) {
      where.nama = { contains: search };
    }
    if (isIndukOnly) {
      where.parentId = null;
    } else if (parentId !== undefined) {
      where.parentId = parentId === '' || parentId === 'null' ? null : parentId;
    }
    if (level !== undefined && level !== null && level !== '') {
      where.level = parseInt(level);
    }

    const [data, total] = await Promise.all([
      prisma.refUnor.findMany({
        where,
        skip,
        take,
        include: {
          parent: {
            select: { id: true, nama: true, level: true, jenis: true }
          },
          _count: {
            select: {
              children: { where: { isDeleted: false } },
              dataP3ks: { where: { isDeleted: false, statusPensiun: 'AKTIF' } }
            }
          }
        },
        orderBy: [
          { level: 'asc' },
          { nama: 'asc' }
        ]
      }),
      prisma.refUnor.count({ where })
    ]);

    return { data, total };
  }

  static async findTree() {
    // Fetch all non-deleted records
    const all = await prisma.refUnor.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: {
            children: { where: { isDeleted: false } },
            dataP3ks: { where: { isDeleted: false, statusPensiun: 'AKTIF' } }
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { nama: 'asc' }
      ]
    });

    // Build hierarchical tree in memory
    const map = new Map();
    const roots = [];

    all.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    all.forEach(item => {
      const node = map.get(item.id);
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  static async findById(id) {
    return prisma.refUnor.findFirst({
      where: { id, isDeleted: false },
      include: {
        parent: {
          select: { id: true, nama: true, level: true, jenis: true }
        },
        children: {
          where: { isDeleted: false },
          orderBy: { nama: 'asc' },
          include: {
            _count: {
              select: {
                dataP3ks: { where: { isDeleted: false, statusPensiun: 'AKTIF' } }
              }
            }
          }
        },
        _count: {
          select: {
            children: { where: { isDeleted: false } },
            dataP3ks: { where: { isDeleted: false, statusPensiun: 'AKTIF' } }
          }
        }
      }
    });
  }

  static async findByNameAndParent(nama, parentId = null, excludeId = null) {
    let where = {
      nama,
      parentId: parentId || null,
      isDeleted: false
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return prisma.refUnor.findFirst({ where });
  }

  static async findByName(nama, excludeId = null) {
    let where = { nama, isDeleted: false };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return prisma.refUnor.findFirst({ where });
  }

  static async create(data) {
    return prisma.refUnor.create({
      data,
      include: {
        parent: {
          select: { id: true, nama: true, level: true, jenis: true }
        }
      }
    });
  }

  static async update(id, data) {
    return prisma.refUnor.update({
      where: { id },
      data,
      include: {
        parent: {
          select: { id: true, nama: true, level: true, jenis: true }
        }
      }
    });
  }

  static async delete(id) {
    return prisma.refUnor.update({
      where: { id },
      data: { isDeleted: true }
    });
  }
}
