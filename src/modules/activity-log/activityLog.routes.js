import express from 'express';
import activityLogController from './activityLog.controller.js';
import { getLogsSchema, toggleLoggingSchema, archiveLogsSchema } from './activityLog.validation.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

const validate = (schema, source = 'body') => (req, res, next) => {
  const { error } = schema.validate(req[source], { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      data: error.details.map((err) => err.message)
    });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Activity Logs
 *   description: Endpoints for application activity logs
 */

router.get('/', authenticate, authorize('admin'), validate(getLogsSchema, 'query'), activityLogController.getLogs);
router.get('/settings/status', authenticate, authorize('admin'), activityLogController.getLoggingStatus);
router.patch('/settings/toggle', authenticate, authorize('admin'), validate(toggleLoggingSchema, 'body'), activityLogController.toggleLogging);
router.post('/archive', authenticate, authorize('admin'), validate(archiveLogsSchema, 'body'), activityLogController.archiveOldLogs);

export const activityLogRoutes = router;
