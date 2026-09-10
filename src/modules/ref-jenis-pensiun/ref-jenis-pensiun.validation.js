import Joi from 'joi';

export const createJenisPensiunSchema = Joi.object({
  kode: Joi.string().max(50).optional().allow('', null),
  nama: Joi.string().max(255).required().messages({
    'string.empty': 'Nama jenis pensiun wajib diisi',
    'any.required': 'Nama jenis pensiun wajib diisi',
  }),
  keterangan: Joi.string().optional().allow('', null),
  isActive: Joi.boolean().optional().default(true),
});

export const updateJenisPensiunSchema = Joi.object({
  kode: Joi.string().max(50).optional().allow('', null),
  nama: Joi.string().max(255).optional(),
  keterangan: Joi.string().optional().allow('', null),
  isActive: Joi.boolean().optional(),
});
