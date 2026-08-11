import kegiatanService from './kegiatan.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';
import { createKegiatanSchema, updateKegiatanSchema, listKegiatanQuerySchema } from './kegiatan.validation.js';

class KegiatanController {
  /**
   * @swagger
   * /api/kegiatans:
   *   get:
   *     summary: Get list of kegiatan with pagination and optional search
   *     tags: [Kegiatan]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Items per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term for nama field (case-insensitive)
   *     responses:
   *       200:
   *         description: Successful retrieval of kegiatan list
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden (admin only)
   */
  list = asyncHandler(async (req, res) => {
    const { error, value } = listKegiatanQuerySchema.validate(req.query);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }
    const result = await kegiatanService.list(value);
    res.status(200).json({ success: true, message: 'Berhasil mendapatkan kegiatan', data: result });
  });

  /**
   * @swagger
   * /api/kegiatans:
   *   post:
   *     summary: Create a new kegiatan (admin only)
   *     tags: [Kegiatan]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateKegiatan'
   *     responses:
   *       201:
   *         description: Kegiatan created
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  create = asyncHandler(async (req, res) => {
    const { error, value } = createKegiatanSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }
    const kegiatan = await kegiatanService.create(value);
    res.status(201).json({ success: true, message: 'Kegiatan berhasil ditambahkan', data: kegiatan });
  });

  /**
   * @swagger
   * /api/kegiatans/{id}:
   *   put:
   *     summary: Update an existing kegiatan (admin only)
   *     tags: [Kegiatan]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Kegiatan ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateKegiatan'
   *     responses:
   *       200:
   *         description: Kegiatan updated
   *       400:
   *         description: Validation error
   *       404:
   *         description: Not found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  update = asyncHandler(async (req, res) => {
    const { error, value } = updateKegiatanSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }
    const kegiatan = await kegiatanService.update(req.params.id, value);
    res.status(200).json({ success: true, message: 'Kegiatan berhasil diubah', data: kegiatan });
  });

  /**
   * @swagger
   * /api/kegiatans/{id}:
   *   delete:
   *     summary: Delete a kegiatan (admin only)
   *     tags: [Kegiatan]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Kegiatan ID
   *     responses:
   *       200:
   *         description: Kegiatan deleted
   *       404:
   *         description: Not found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  delete = asyncHandler(async (req, res) => {
    await kegiatanService.delete(req.params.id);
    res.status(200).json({ success: true, message: 'Kegiatan berhasil dihapus' });
  });
}

export default new KegiatanController();
