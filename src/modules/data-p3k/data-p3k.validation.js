import Joi from 'joi';

export const setPensiunSchema = Joi.object({
  nipBaru: Joi.string().required(),
  nomorSk: Joi.string().required(),
  tanggalSk: Joi.string().required(),
});
export const setPensionSchema = setPensiunSchema;

export const updatePensiunSchema = Joi.object({
  nipBaru: Joi.string().required(),
  nomorSk: Joi.string().optional().allow('', null),
  tanggalSk: Joi.string().optional().allow('', null),
});
export const updatePensionSchema = updatePensiunSchema;

export const revertPensiunSchema = Joi.object({
  nipBaru: Joi.string().required(),
});
export const revertPensionSchema = revertPensiunSchema;

export const updateDataP3kSchema = Joi.object({
  unorIndukId: Joi.string().optional().allow(null, ''),
  unorNama: Joi.string().optional().allow(''),
  nama: Joi.string().optional().allow(''),
  gelarDepan: Joi.string().optional().allow(''),
  gelarBelakang: Joi.string().optional().allow(''),
  pendidikanNama: Joi.string().optional().allow(''),
  lokasiKerjaNama: Joi.string().optional().allow(''),
}).unknown(true);

export const mappingUnorQuerySchema = Joi.object({
  search: Joi.string().optional().allow(''),
  unorNama: Joi.string().optional().allow(''),
  refUnorId: Joi.string().uuid().optional().allow('', null),
  isMappingMode: Joi.boolean().optional().default(false),
  unorStatus: Joi.string().valid('ALL', 'MAPPED', 'UNMAPPED').default('ALL'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

export const updateMappingUnorSchema = Joi.object({
  unorIndukId: Joi.string().uuid().allow(null, '').required(),
});

export const bulkMappingUnorSchema = Joi.object({
  ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  unorIndukId: Joi.string().uuid().allow(null, '').required(),
});

