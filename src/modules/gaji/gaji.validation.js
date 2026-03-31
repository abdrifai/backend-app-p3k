import Joi from 'joi';

export const createGajiSchema = Joi.object({
  golongan: Joi.string().required().messages({
    'string.empty': 'Golongan tidak boleh kosong',
    'any.required': 'Golongan wajib diisi'
  }),
  mkTahun: Joi.number().integer().min(0).required().messages({
    'number.base': 'Masa kerja tahun harus berupa angka',
    'number.min': 'Masa kerja tahun tidak boleh negatif',
    'any.required': 'Masa kerja tahun wajib diisi'
  }),
  gaji: Joi.number().integer().min(0).required().messages({
    'number.base': 'Gaji harus berupa angka',
    'number.min': 'Gaji tidak boleh negatif',
    'any.required': 'Gaji wajib diisi'
  }),
  aturanGaji: Joi.string().allow('', null).optional()
});
