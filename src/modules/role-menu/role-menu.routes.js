import { Router } from 'express';
import { RoleMenuController } from './role-menu.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// Protect all routes
router.use(authenticate);

/**
 * @swagger
 * /api/role-menus/my-menus:
 *   get:
 *     summary: Mendapatkan daftar menu yang diizinkan untuk role user yang sedang login
 *     tags: [Role Menu Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan daftar menu
 *       401:
 *         description: Unauthorized
 */
router.get('/my-menus', RoleMenuController.getMyMenus);

/**
 * @swagger
 * /api/role-menus:
 *   get:
 *     summary: Mendapatkan katalog menu dan seluruh konfigurasi permissions per role (Admin only)
 *     tags: [Role Menu Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan konfigurasi
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', authorize('admin'), RoleMenuController.getAllRolePermissions);

/**
 * @swagger
 * /api/role-menus/roles:
 *   get:
 *     summary: Mendapatkan daftar role yang tersedia (Admin only)
 *     tags: [Role Menu Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan roles
 */
router.get('/roles', authorize('admin'), RoleMenuController.getRoles);

/**
 * @swagger
 * /api/role-menus:
 *   put:
 *     summary: Menyimpan konfigurasi permissions menu untuk role tertentu (Admin only)
 *     tags: [Role Menu Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - permissions
 *             properties:
 *               role:
 *                 type: string
 *                 example: "user"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - menuKey
 *                     - isAllowed
 *                   properties:
 *                     menuKey:
 *                       type: string
 *                       example: "profil-pegawai"
 *                     isAllowed:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       200:
 *         description: Permissions berhasil diperbarui
 *       400:
 *         description: Validasi error
 *       403:
 *         description: Forbidden
 */
router.put('/', authorize('admin'), RoleMenuController.updateRolePermissions);

export default router;

