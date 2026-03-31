import Joi from 'joi';

export const createUsulanSchema = Joi.object({
  nipBaru: Joi.string().required().messages({
    'any.required': 'NIP Baru wajib diisi',
    'string.empty': 'NIP Baru tidak boleh kosong'
  }),
  tanggalMulai: Joi.string().required().messages({
    'any.required': 'Tanggal mulai kontrak wajib diisi'
  }),
  tanggalSelesai: Joi.string().required().messages({
    'any.required': 'Tanggal selesai kontrak wajib diisi'
  }),
  keterangan: Joi.string().allow('', null).optional(),
  templateKontrakId: Joi.string().required().messages({
    'any.required': 'Template kontrak wajib dipilih',
    'string.empty': 'Template kontrak wajib dipilih'
  }),
  nomorKontrak: Joi.string().required().messages({
    'any.required': 'Nomor kontrak wajib diisi',
    'string.empty': 'Nomor kontrak tidak boleh kosong'
  }),
  tanggalTtd: Joi.string().required().messages({
    'any.required': 'Tanggal tanda tangan wajib diisi'
  }),
  kontrakKe: Joi.number().min(1).required().messages({
    'any.required': 'Urutan kontrak (Kontrak Ke) wajib diisi',
    'number.base': 'Urutan kontrak harus berupa angka'
  })
});

export const rejectUsulanSchema = Joi.object({
  alasanPenolakan: Joi.string().required().messages({
    'any.required': 'Alasan penolakan wajib diisi'
  })
});

export const createTemplateSchema = Joi.object({
  nama: Joi.string().required().messages({
    'any.required': 'Nama template wajib diisi'
  }),
  deskripsi: Joi.string().allow('', null).optional()
});
