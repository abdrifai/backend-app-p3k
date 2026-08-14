import prisma from '../../config/database.js';

export class RoleMenuRepository {
  /**
   * Get all permissions in DB
   */
  static async findAll() {
    return prisma.roleMenuPermission.findMany({
      orderBy: [{ role: 'asc' }, { menuKey: 'asc' }]
    });
  }

  /**
   * Get all permissions for a specific role
   */
  static async findByRole(role) {
    return prisma.roleMenuPermission.findMany({
      where: { role: role.toLowerCase() }
    });
  }

  /**
   * Get distinct roles present in system (from User table + default roles)
   */
  static async getDistinctRoles() {
    const userRoles = await prisma.user.findMany({
      where: { isDeleted: false },
      select: { role: true },
      distinct: ['role']
    });

    const set = new Set(['admin', 'user', 'pensiun']);
    userRoles.forEach(u => {
      if (u.role) set.add(u.role.toLowerCase());
    });

    return Array.from(set).sort();
  }

  /**
   * Update permissions for a role in a transaction
   * @param {string} role 
   * @param {Array<{menuKey: string, isAllowed: boolean}>} permissions 
   */
  static async updateRolePermissions(role, permissions) {
    const normalizedRole = role.toLowerCase();

    return prisma.$transaction(async (tx) => {
      // 1. Delete existing for this role
      await tx.roleMenuPermission.deleteMany({
        where: { role: normalizedRole }
      });

      // 2. Create new permissions
      if (permissions && permissions.length > 0) {
        await tx.roleMenuPermission.createMany({
          data: permissions.map(p => ({
            role: normalizedRole,
            menuKey: p.menuKey,
            isAllowed: Boolean(p.isAllowed)
          }))
        });
      }

      // 3. Return updated list
      return tx.roleMenuPermission.findMany({
        where: { role: normalizedRole }
      });
    });
  }
}
