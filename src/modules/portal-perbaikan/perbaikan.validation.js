import Joi from 'joi';
import { KATEGORI_PERBAIKAN, AKSI_PERBAIKAN } from './perbaikan.constants.js';

export const buatUsulanSchema = Joi.object({
  kategori: Joi.string()
    .valid(...Object.values(KATEGORI_PERBAIKAN))
    .required()
    .messages({
      'any.only': 'Kategori perbaikan tidak valid',
      'any.required': 'Kategori wajib diisi'
    }),
  aksi: Joi.string()
    .valid(...Object.values(AKSI_PERBAIKAN))
    .required()
    .messages({
      'any.only': 'Aksi perbaikan tidak valid',
      'any.required': 'Aksi wajib diisi'
    }),
  targetId: Joi.string().allow(null, '').optional(),
  dataBaru: Joi.alternatives().try(
    Joi.object(),
    Joi.string() // stringified JSON dari form-data
  ).when('aksi', {
    is: AKSI_PERBAIKAN.HAPUS,
    then: Joi.optional(),
    otherwise: Joi.required()
  }).messages({
    'any.required': 'Data usulan baru wajib diisi'
  }),
  alasan: Joi.string().min(5).max(1000).required().messages({
    'string.min': 'Alasan perbaikan minimal 5 karakter',
    'string.max': 'Alasan perbaikan maksimal 1000 karakter',
    'any.required': 'Alasan perbaikan wajib diisi'
  })
});

export const revisiUsulanSchema = Joi.object({
  dataBaru: Joi.alternatives().try(
    Joi.object(),
    Joi.string()
  ).required().messages({
    'any.required': 'Data usulan perbaikan baru wajib diisi'
  }),
  alasan: Joi.string().min(5).max(1000).required().messages({
    'string.min': 'Alasan perbaikan minimal 5 karakter',
    'string.max': 'Alasan perbaikan maksimal 1000 karakter',
    'any.required': 'Alasan perbaikan wajib diisi'
  })
});
