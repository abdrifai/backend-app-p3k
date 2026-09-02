import Joi from 'joi';

export const refUnorSchema = Joi.object({
  nama: Joi.string().trim().required().messages({
    'string.empty': 'Nama unit kerja tidak boleh kosong',
    'any.required': 'Nama unit kerja wajib diisi'
  }),
  kode: Joi.string().trim().optional().allow('', null),
  parentId: Joi.string().trim().optional().allow('', null),
  jenis: Joi.string()
    .valid('INDUK', 'BIDANG', 'SEKSI', 'UPTD', 'PUSKESMAS', 'SEKOLAH', 'SUB_UNOR')
    .default('INDUK')
    .optional(),
  isActive: Joi.boolean().optional().default(true),
  keterangan: Joi.string().trim().optional().allow('', null)
});
