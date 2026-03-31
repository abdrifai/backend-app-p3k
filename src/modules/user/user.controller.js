import userService from './user.service.js';
import { 
  createUserSchema, loginUserSchema, updateUserSchema, 
  updateProfileSchema, forgotPasswordSchema, resetPasswordSchema 
} from './user.validation.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

class UserController {
  register = asyncHandler(async (req, res) => {
    // Validate request body
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    // Call service layer
    const user = await userService.register(value);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  });

  login = asyncHandler(async (req, res) => {
    // Validate request body
    const { error, value } = loginUserSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    // Call service layer
    const authData = await userService.login(value.username, value.password);

    // Set cookie (HTTP-only)
    res.cookie('token', authData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      data: authData
    });
  });

  /**
   * @swagger
   * /api/users/forgot-password:
   *   post:
   *     tags: [Users]
   *     summary: Request password reset link
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *     responses:
   *       200:
   *         description: Reset password link sent
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const result = await userService.forgotPassword(value.email);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  /**
   * @swagger
   * /api/users/reset-password:
   *   post:
   *     tags: [Users]
   *     summary: Reset password with token
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               token:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password reset successfully
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const result = await userService.resetPassword(value.token, value.password);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  /**
   * @swagger
   * /api/users:
   *   get:
   *     tags: [Users]
   *     summary: Get all users
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Berhasil mengambil data user
   */
  getAll = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await userService.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data user',
      ...result
    });
  });

  /**
   * @swagger
   * /api/users/{id}:
   *   put:
   *     tags: [Users]
   *     summary: Update user
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User berhasil diperbarui
   */
  update = asyncHandler(async (req, res) => {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const user = await userService.updateUser(req.params.id, value);

    res.status(200).json({
      success: true,
      message: 'User berhasil diperbarui',
      data: user
    });
  });

  /**
   * @swagger
   * /api/users/{id}:
   *   delete:
   *     tags: [Users]
   *     summary: Delete user (soft)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User berhasil dihapus
   */
  remove = asyncHandler(async (req, res) => {
    await userService.deleteUser(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User berhasil dihapus',
      data: null
    });
  });

  getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const user = await userService.getUserById(userId);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil profil',
      data: user
    });
  });

  updateProfile = asyncHandler(async (req, res) => {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }

    const userId = req.user.id;
    const user = await userService.updateProfile(userId, value, req.file);

    res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: user
    });
  });
}

export default new UserController();
