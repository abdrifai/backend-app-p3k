import prisma from '../../config/database.js';

class UserRepository {
  async create(data) {
    // If any soft-deleted user retains this username or email, suffix their unique fields to release database constraints
    const softDeletedConflicts = await prisma.user.findMany({
      where: {
        isDeleted: true,
        OR: [
          ...(data.username ? [{ username: data.username }] : []),
          ...(data.email ? [{ email: data.email }] : [])
        ]
      }
    });

    if (softDeletedConflicts.length > 0) {
      for (const sUser of softDeletedConflicts) {
        const timestamp = Date.now();
        await prisma.user.update({
          where: { id: sUser.id },
          data: {
            username: sUser.username === data.username ? `${sUser.username}_del_${timestamp}` : sUser.username,
            email: sUser.email === data.email ? `${sUser.email}_del_${timestamp}` : sUser.email
          }
        });
      }
    }

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
    return await prisma.user.findFirst({
      where: { email, isDeleted: false }
    });
  }

  async findByUsername(username) {
    return await prisma.user.findFirst({
      where: { username, isDeleted: false }
    });
  }

  async findById(id) {
    return await prisma.user.findFirst({
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

  async findAll({ skip = 0, take = 10, search = '', status = 'active' } = {}) {
    const where = {};
    if (status === 'active') {
      where.isDeleted = false;
    } else if (status === 'inactive') {
      where.isDeleted = true;
    }

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { namaLengkap: { contains: search } }
      ];
    }

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
          isDeleted: true,
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
    // If email or username is being updated, check if any soft-deleted user retains them
    if (data.username || data.email) {
      const softDeletedConflicts = await prisma.user.findMany({
        where: {
          isDeleted: true,
          id: { not: id },
          OR: [
            ...(data.username ? [{ username: data.username }] : []),
            ...(data.email ? [{ email: data.email }] : [])
          ]
        }
      });

      for (const sUser of softDeletedConflicts) {
        const timestamp = Date.now();
        await prisma.user.update({
          where: { id: sUser.id },
          data: {
            username: sUser.username === data.username ? `${sUser.username}_del_${timestamp}` : sUser.username,
            email: sUser.email === data.email ? `${sUser.email}_del_${timestamp}` : sUser.email
          }
        });
      }
    }

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
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;

    const timestamp = Date.now();
    return await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        username: `${user.username}_del_${timestamp}`,
        email: `${user.email}_del_${timestamp}`
      },
      select: {
        id: true,
        username: true
      }
    });
  }

  async findSoftDeletedUser(username, email) {
    return await prisma.user.findFirst({
      where: {
        isDeleted: true,
        OR: [
          ...(username ? [{ username: username }, { username: { startsWith: `${username}_del_` } }] : []),
          ...(email ? [{ email: email }, { email: { startsWith: `${email}_del_` } }] : [])
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        namaLengkap: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async reactivateUser(id, data) {
    const updateData = {
      isDeleted: false
    };

    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;
    if (data.namaLengkap) updateData.namaLengkap = data.namaLengkap;
    if (data.role) updateData.role = data.role;
    if (data.password) updateData.password = data.password;

    return await prisma.user.update({
      where: { id },
      data: updateData,
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
