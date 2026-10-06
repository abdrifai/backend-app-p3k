import Joi from 'joi';

export const queryInboxSchema = Joi.object({
  status: Joi.string().allow('').optional(),
  kategori: Joi.string().allow('').optional(),
  jenisPegawai: Joi.string().valid('PENUH_WAKTU', 'PARUH_WAKTU', '').optional(),
  search: Joi.string().allow('').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

export const prosesSchema = Joi.object({
  catatan: Joi.string().allow('', null).optional()
});

export const perluPerbaikanSchema = Joi.object({
  catatan: Joi.string().min(5).max(1000).required().messages({
    'string.min': 'Catatan alasan perbaikan minimal 5 karakter',
    'string.max': 'Catatan alasan perbaikan maksimal 1000 karakter',
    'any.required': 'Catatan alasan perbaikan wajib diisi'
  })
});

export const tolakSchema = Joi.object({
  catatan: Joi.string().min(5).max(1000).required().messages({
    'string.min': 'Catatan penolakan minimal 5 karakter',
    'string.max': 'Catatan penolakan maksimal 1000 karakter',
    'any.required': 'Catatan penolakan wajib diisi'
  })
});

export const setujuiSchema = Joi.object({
  catatan: Joi.string().allow('', null).max(1000).optional()
});
