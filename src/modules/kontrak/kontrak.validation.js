import Joi from 'joi';

export const addContractSchema = Joi.object({
  nipBaru: Joi.string().required().messages({
    'any.required': 'NIP Baru wajib diisi',
    'string.empty': 'NIP Baru tidak boleh kosong'
  }),
  tanggalMulai: Joi.string().required().messages({
    'any.required': 'Tanggal mulai kontrak wajib diisi',
    'string.empty': 'Tanggal mulai kontrak tidak boleh kosong'
  }),
  tanggalSelesai: Joi.string().required().messages({
    'any.required': 'Tanggal selesai kontrak wajib diisi',
    'string.empty': 'Tanggal selesai kontrak tidak boleh kosong'
  }),
  keterangan: Joi.string().allow('', null).optional(),
  nomorKontrak: Joi.string().allow('', null).optional(),
  golongan: Joi.string().allow('', null).optional(),
  gajiPokok: Joi.number().allow('', null).optional(),
  mkTahun: Joi.number().allow('', null).optional(),
  mkBulan: Joi.number().allow('', null).optional()
});

export const updateContractSchema = Joi.object({
  tanggalMulai: Joi.string().allow('', null).optional(),
  tanggalSelesai: Joi.string().allow('', null).optional(),
  keterangan: Joi.string().allow('', null).optional(),
  nomorKontrak: Joi.string().allow('', null).optional(),
  golongan: Joi.string().allow('', null).optional(),
  gajiPokok: Joi.number().allow('', null).optional(),
  mkTahun: Joi.number().allow('', null).optional(),
  mkBulan: Joi.number().allow('', null).optional()
});
