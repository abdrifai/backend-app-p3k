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

