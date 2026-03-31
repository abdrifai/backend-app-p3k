import Joi from 'joi';

export const setPensionSchema = Joi.object({
  nipBaru: Joi.string().required(),
  nomorSk: Joi.string().required(),
  tanggalSk: Joi.string().required(),
});

export const updatePensionSchema = Joi.object({
  nipBaru: Joi.string().required(),
  nomorSk: Joi.string().optional(),
  tanggalSk: Joi.string().optional(),
});

export const revertPensionSchema = Joi.object({
  nipBaru: Joi.string().required(),
});

export const updateDataP3kSchema = Joi.object({
  unorIndukId: Joi.string().optional().allow(null, ''),
  unorNama: Joi.string().optional().allow(''),
  nama: Joi.string().optional().allow(''),
  gelarDepan: Joi.string().optional().allow(''),
  gelarBelakang: Joi.string().optional().allow(''),
  pendidikanNama: Joi.string().optional().allow(''),
  lokasiKerjaNama: Joi.string().optional().allow(''),
}).unknown(true);

