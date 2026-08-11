import Joi from 'joi';

export const getLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  userId: Joi.string().optional().allow('', null),
  entityType: Joi.string().max(50).optional().allow('', null),
  entityId: Joi.string().max(100).optional().allow('', null),
  nip: Joi.string().max(50).optional().allow('', null),
  search: Joi.string().max(100).optional().allow('', null),
  action: Joi.string().max(50).optional().allow('', null),
  startDate: Joi.string().isoDate().optional().allow('', null),
  endDate: Joi.string().isoDate().optional().allow('', null),
});

export const toggleLoggingSchema = Joi.object({
  enabled: Joi.boolean().required()
});

export const archiveLogsSchema = Joi.object({
  daysOlder: Joi.number().integer().min(1).required()
});
