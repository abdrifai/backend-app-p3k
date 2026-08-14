import { RoleMenuService } from './role-menu.service.js';
import { updateRolePermissionsSchema } from './role-menu.validation.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

export class RoleMenuController {
  /**
   * @swagger
   * /api/role-menus:
   *   get:
   *     tags: [Role Menu Permissions]
   *     summary: Ambil matrix hak akses menu untuk seluruh role
   *     responses:
   *       200:
   *         description: Berhasil mengambil data permissions
   */
  static getAllRolePermissions = asyncHandler(async (req, res) => {
    const result = await RoleMenuService.getAllRolePermissions();
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil konfigurasi hak akses menu',
      data: result
    });
  });

  /**
   * @swagger
   * /api/role-menus/my-menus:
   *   get:
   *     tags: [Role Menu Permissions]
   *     summary: Ambil daftar menu yang diizinkan untuk user saat ini
   *     responses:
   *       200:
   *         description: Berhasil mengambil menu user
   */
  static getMyMenus = asyncHandler(async (req, res) => {
    const userRole = req.user?.role || 'user';
    const result = await RoleMenuService.getMyMenus(userRole);
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil menu pengguna',
      data: result
    });
  });

  /**
   * @swagger
   * /api/role-menus/roles:
   *   get:
   *     tags: [Role Menu Permissions]
   *     summary: Ambil daftar seluruh role aktif
   *     responses:
   *       200:
   *         description: Berhasil mengambil roles
   */
  static getRoles = asyncHandler(async (req, res) => {
    const roles = await RoleMenuService.getRoles();
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar role',
      data: roles
    });
  });

  /**
   * @swagger
   * /api/role-menus:
   *   put:
   *     tags: [Role Menu Permissions]
   *     summary: Simpan / update hak akses menu untuk suatu role
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               role: { type: string }
   *               permissions:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     menuKey: { type: string }
   *                     isAllowed: { type: boolean }
   *     responses:
   *       200:
   *         description: Berhasil mengupdate hak akses
   */
  static updateRolePermissions = asyncHandler(async (req, res) => {
    const { error, value } = updateRolePermissionsSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const result = await RoleMenuService.updateRolePermissions(
      value.role,
      value.permissions,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: `Hak akses menu untuk role '${value.role}' berhasil diperbarui`,
      data: result
    });
  });
}
