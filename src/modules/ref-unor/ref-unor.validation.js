import Joi from 'joi';

export const refUnorSchema = Joi.object({
  nama: Joi.string().trim().required().messages({
    'string.empty': 'Nama unit kerja tidak boleh kosong',
    'any.required': 'Nama unit kerja wajib diisi'
  })
});
