import Joi from 'joi';

export const setPemberhentianSchema = Joi.object({
  nipBaru: Joi.string().required().messages({
    'any.required': 'NIP Baru wajib diisi',
    'string.empty': 'NIP Baru tidak boleh kosong'
  }),
  nomorSk: Joi.string().required().messages({
    'any.required': 'Nomor SK wajib diisi',
    'string.empty': 'Nomor SK tidak boleh kosong'
  }),
  tanggalSk: Joi.string().required().messages({
    'any.required': 'Tanggal SK wajib diisi',
    'string.empty': 'Tanggal SK tidak boleh kosong'
  }),
  jenisPensiunId: Joi.string().uuid().optional().allow('', null),
});
export const setPensiunSchema = setPemberhentianSchema;

export const updatePemberhentianSchema = Joi.object({
  nipBaru: Joi.string().required().messages({
    'any.required': 'NIP Baru wajib diisi',
    'string.empty': 'NIP Baru tidak boleh kosong'
  }),
  nomorSk: Joi.string().optional().allow('', null),
  tanggalSk: Joi.string().optional().allow('', null),
  jenisPensiunId: Joi.string().uuid().optional().allow('', null),
});
export const updatePensiunSchema = updatePemberhentianSchema;

export const revertPemberhentianSchema = Joi.object({
  nipBaru: Joi.string().required().messages({
    'any.required': 'NIP Baru wajib diisi',
    'string.empty': 'NIP Baru tidak boleh kosong'
  }),
});
export const revertPensiunSchema = revertPemberhentianSchema;

export const getAllPemberhentianQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),
  search: Joi.string().optional().allow(''),
  jenisPensiunId: Joi.string().optional().allow(''),
  kategori: Joi.string().valid('ALL', 'PENUH_WAKTU', 'PARUH_WAKTU').default('ALL'),
});
