import { RoleMenuRepository } from './role-menu.repository.js';
import { MENU_CATALOG, DEFAULT_PERMISSIONS } from './role-menu.constants.js';
import activityLogService from '../activity-log/activityLog.service.js';

export class RoleMenuService {
  /**
   * Get all menu items catalog
   */
  static getMenuCatalog() {
    return MENU_CATALOG;
  }

  /**
   * Get all distinct roles
   */
  static async getRoles() {
    return await RoleMenuRepository.getDistinctRoles();
  }

  /**
   * Get complete matrix of roles and permissions
   */
  static async getAllRolePermissions() {
    const roles = await RoleMenuRepository.getDistinctRoles();
    const dbPermissions = await RoleMenuRepository.findAll();

    // Map by role -> { [menuKey]: boolean }
    const rolePermissionMap = {};
    roles.forEach(r => {
      rolePermissionMap[r] = {};
      // Initialize with defaults if exists
      const defaults = DEFAULT_PERMISSIONS[r] || (r === 'admin' ? MENU_CATALOG.map(m => m.key) : []);
      MENU_CATALOG.forEach(m => {
        rolePermissionMap[r][m.key] = defaults.includes(m.key);
      });
    });

    // Override with DB permissions
    dbPermissions.forEach(p => {
      if (rolePermissionMap[p.role]) {
        rolePermissionMap[p.role][p.menuKey] = p.isAllowed;
      }
    });

    return {
      catalog: MENU_CATALOG,
      roles,
      matrix: rolePermissionMap
    };
  }

  /**
   * Get allowed menus & submenus for a given user's role(s)
   */
  static async getMyMenus(roleOrRoles) {
    let roles = [];
    if (Array.isArray(roleOrRoles)) {
      roles = roleOrRoles.map(r => String(r).toLowerCase().trim()).filter(Boolean);
    } else {
      roles = String(roleOrRoles || 'user').toLowerCase().split(',').map(r => r.trim()).filter(Boolean);
    }
    if (roles.length === 0) roles = ['user'];

    let allowedKeys = new Set();
    const isAdmin = roles.some(r => ['admin', 'admin_utama', 'superadmin'].includes(r));

    if (isAdmin) {
      // Full access for admin
      MENU_CATALOG.forEach(m => allowedKeys.add(m.key));
    } else {
      // Union permissions across all assigned roles
      for (const r of roles) {
        const dbPermissions = await RoleMenuRepository.findByRole(r);
        if (dbPermissions.length > 0) {
          dbPermissions.forEach(p => {
            if (p.isAllowed) allowedKeys.add(p.menuKey);
          });
        } else {
          // Use defaults for this role
          const defaults = DEFAULT_PERMISSIONS[r] || DEFAULT_PERMISSIONS.user;
          defaults.forEach(k => allowedKeys.add(k));
        }
      }
    }

    // Filter catalog
    const allowedCatalog = MENU_CATALOG.filter(m => allowedKeys.has(m.key));
    const allowedPaths = allowedCatalog.filter(m => m.path).map(m => m.path);

    return {
      role: roles.join(','),
      roles,
      allowedKeys: Array.from(allowedKeys),
      allowedPaths,
      menus: allowedCatalog
    };
  }

  /**
   * Update permissions for a specific role
   */
  static async updateRolePermissions(role, permissions, userId) {
    const normalizedRole = String(role || '').toLowerCase().trim();
    if (!normalizedRole) {
      const err = new Error('Role tidak valid');
      err.statusCode = 400;
      throw err;
    }

    const updated = await RoleMenuRepository.updateRolePermissions(normalizedRole, permissions);

    // Log Activity
    if (userId) {
      activityLogService.logActivity(userId, 'UPDATE_ROLE_MENU_PERMISSIONS', 'RoleMenuPermission', normalizedRole, {
        role: normalizedRole,
        totalConfigured: permissions.length,
        allowedCount: permissions.filter(p => p.isAllowed).length
      });
    }

    return {
      role: normalizedRole,
      updatedCount: updated.length
    };
  }
}
