import Joi from 'joi';

export const createKategoriSchema = Joi.object({
  kode: Joi.string().trim().uppercase().max(50).allow('', null).optional(),
  nama: Joi.string().trim().max(150).required().messages({
    'string.empty': 'Nama kategori wajib diisi',
    'any.required': 'Nama kategori wajib diisi'
  }),
  deskripsi: Joi.string().allow('', null).optional(),
  warnaBadge: Joi.string().trim().max(20).default('#ef4444'),
  isActive: Joi.boolean().default(true)
});

export const updateKategoriSchema = Joi.object({
  kode: Joi.string().trim().uppercase().max(50).optional(),
  nama: Joi.string().trim().max(150).optional(),
  deskripsi: Joi.string().allow('', null).optional(),
  warnaBadge: Joi.string().trim().max(20).optional(),
  isActive: Joi.boolean().optional()
});
