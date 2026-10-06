import Joi from 'joi';
import { JABATAN_PEJABAT, JENIS_TTE } from './bsre.constants.js';

export const signPassphraseSchema = Joi.object({
  passphrase: Joi.string().min(1).required().messages({
    'string.empty': 'Passphrase tanda tangan elektronik wajib diisi',
    'any.required': 'Passphrase tanda tangan elektronik wajib diisi'
  })
});

export const tolakTteSchema = Joi.object({
  catatan: Joi.string().min(5).max(1000).required().messages({
    'string.min': 'Alasan penolakan tanda tangan minimal 5 karakter',
    'string.max': 'Alasan penolakan maksimal 1000 karakter',
    'any.required': 'Alasan penolakan wajib diisi'
  })
});

export const pejabatPenandatanganSchema = Joi.object({
  userId: Joi.string().required(),
  jabatan: Joi.string().valid(...Object.values(JABATAN_PEJABAT)).required(),
  nama: Joi.string().required(),
  nip: Joi.string().allow('', null).optional(),
  nik: Joi.string().length(16).pattern(/^[0-9]+$/).required().messages({
    'string.length': 'NIK harus terdiri dari 16 digit angka',
    'string.pattern.base': 'NIK harus berupa angka'
  }),
  jenis: Joi.string().valid(...Object.values(JENIS_TTE)).required(),
  urutan: Joi.number().integer().min(1).required(),
  isActive: Joi.boolean().default(true)
});
