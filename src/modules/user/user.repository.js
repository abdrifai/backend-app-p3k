import prisma from '../../config/database.js';

class UserRepository {
  async create(data) {
    return await prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        email: true,
        namaLengkap: true,
        role: true,
        foto: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email, isDeleted: false }
    });
  }

  async findByUsername(username) {
    return await prisma.user.findUnique({
      where: { username, isDeleted: false }
    });
  }

  async findById(id) {
    return await prisma.user.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        username: true,
        email: true,
        namaLengkap: true,
        role: true,
        foto: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async findAll({ skip = 0, take = 10, search = '' } = {}) {
    const where = {
      isDeleted: false,
      ...(search ? {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } },
          { namaLengkap: { contains: search } }
        ]
      } : {})
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          username: true,
          email: true,
          namaLengkap: true,
          role: true,
          foto: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return { data, total };
  }

  async update(id, data) {
    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        namaLengkap: true,
        role: true,
        foto: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async softDelete(id) {
    return await prisma.user.update({
      where: { id },
      data: { isDeleted: true },
      select: {
        id: true,
        username: true
      }
    });
  }

  async createPasswordResetToken(email, token, expiresAt) {
    return await prisma.passwordResetToken.create({
      data: { email, token, expiresAt }
    });
  }

  async findPasswordResetToken(token) {
    return await prisma.passwordResetToken.findUnique({
      where: { token }
    });
  }

  async deletePasswordResetToken(id) {
    return await prisma.passwordResetToken.delete({
      where: { id }
    });
  }
}

export default new UserRepository();
