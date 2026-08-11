import Joi from 'joi';

export const createKegiatanSchema = Joi.object({
  label: Joi.string().max(150).required()
});

export const updateKegiatanSchema = Joi.object({
  label: Joi.string().max(150).required()
});

export const listKegiatanQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow('').optional()
});
