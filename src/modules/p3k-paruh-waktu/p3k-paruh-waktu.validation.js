import Joi from 'joi';

export const p3kParuhWaktuQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  search: Joi.string().allow('', null).optional(),
  unorNama: Joi.string().allow('', null).optional(),
  unorInduk: Joi.string().allow('', null).optional(),
  unorIndukId: Joi.string().allow('', null).optional(),
  golAkhirNama: Joi.string().allow('', null).optional(),
  jenisJabatanNama: Joi.string().allow('', null).optional(),
  tingkatPendidikanNama: Joi.string().allow('', null).optional(),
  jabatanNama: Joi.string().allow('', null).optional(),
  jenisKelamin: Joi.string().allow('', null).optional(),
  lokasiKerjaNama: Joi.string().allow('', null).optional(),
  agamaNama: Joi.string().allow('', null).optional(),
  jenisKawinNama: Joi.string().allow('', null).optional(),
  tmtCpns: Joi.string().allow('', null).optional(),
  ageRange: Joi.string().allow('', null).optional()
});

export const importParuhWaktuOptionSchema = Joi.object({
  replaceAll: Joi.boolean().default(true)
});

export const p3kParuhWaktuStatsQuerySchema = Joi.object({
  source: Joi.string().valid('master', 'staging').default('master')
});

