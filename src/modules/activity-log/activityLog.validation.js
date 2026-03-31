import Joi from 'joi';

export const getLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  userId: Joi.string().uuid().optional(),
  entityType: Joi.string().max(50).optional(),
  entityId: Joi.string().uuid().optional(),
});

export const toggleLoggingSchema = Joi.object({
  enabled: Joi.boolean().required()
});

export const archiveLogsSchema = Joi.object({
  daysOlder: Joi.number().integer().min(1).required()
});
