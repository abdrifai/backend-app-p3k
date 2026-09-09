import Joi from 'joi';

export const createMasalahPegawaiSchema = Joi.object({
  nomorKasus: Joi.string().trim().max(100).allow('', null).optional(),
  dataP3kId: Joi.string().required().messages({
    'string.empty': 'Pegawai (Data P3K) wajib dipilih',
    'any.required': 'Pegawai (Data P3K) wajib dipilih'
  }),
  kategoriId: Joi.string().required().messages({
    'string.empty': 'Kategori masalah wajib dipilih',
    'any.required': 'Kategori masalah wajib dipilih'
  }),
  judul: Joi.string().trim().max(255).required().messages({
    'string.empty': 'Judul masalah wajib diisi',
    'any.required': 'Judul masalah wajib diisi'
  }),
  tanggalKejadian: Joi.date().iso().allow(null, '').optional(),
  tingkatKeparahan: Joi.string().valid('RINGAN', 'SEDANG', 'BERAT', 'KRITIS').default('SEDANG'),
  status: Joi.string().valid('OPEN', 'INVESTIGASI', 'TINDAK_LANJUT', 'SELESAI', 'DIBATALKAN').default('OPEN'),
  deskripsi: Joi.string().required().messages({
    'string.empty': 'Deskripsi/kronologi masalah wajib diisi',
    'any.required': 'Deskripsi/kronologi masalah wajib diisi'
  }),
  ringkasanMasalah: Joi.string().max(500).allow('', null).optional(),
  tindakLanjut: Joi.string().allow('', null).optional(),
  catatanPenyelesaian: Joi.string().allow('', null).optional(),
  tanggalSelesai: Joi.date().iso().allow(null, '').optional()
});

export const updateMasalahPegawaiSchema = Joi.object({
  nomorKasus: Joi.string().trim().max(100).allow('', null).optional(),
  kategoriId: Joi.string().optional(),
  judul: Joi.string().trim().max(255).optional(),
  tanggalKejadian: Joi.date().iso().allow(null, '').optional(),
  tingkatKeparahan: Joi.string().valid('RINGAN', 'SEDANG', 'BERAT', 'KRITIS').optional(),
  status: Joi.string().valid('OPEN', 'INVESTIGASI', 'TINDAK_LANJUT', 'SELESAI', 'DIBATALKAN').optional(),
  deskripsi: Joi.string().optional(),
  ringkasanMasalah: Joi.string().max(500).allow('', null).optional(),
  tindakLanjut: Joi.string().allow('', null).optional(),
  catatanPenyelesaian: Joi.string().allow('', null).optional(),
  tanggalSelesai: Joi.date().iso().allow(null, '').optional()
});

export const addTindakLanjutSchema = Joi.object({
  statusBaru: Joi.string().valid('OPEN', 'INVESTIGASI', 'TINDAK_LANJUT', 'SELESAI', 'DIBATALKAN').required().messages({
    'any.required': 'Status baru wajib diisi'
  }),
  tindakan: Joi.string().trim().max(255).required().messages({
    'string.empty': 'Tindakan/progres wajib diisi',
    'any.required': 'Tindakan/progres wajib diisi'
  }),
  keterangan: Joi.string().allow('', null).optional(),
  tanggalSelesai: Joi.date().iso().allow(null, '').optional()
});

export const filterMasalahQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow('', null).optional(),
  kategoriId: Joi.string().allow('', null).optional(),
  status: Joi.string().allow('', null).optional(),
  tingkatKeparahan: Joi.string().allow('', null).optional(),
  unorIndukId: Joi.string().allow('', null).optional(),
  dataP3kId: Joi.string().allow('', null).optional(),
  startDate: Joi.string().allow('', null).optional(),
  endDate: Joi.string().allow('', null).optional(),
  sortBy: Joi.string().valid('createdAt', 'tanggalKejadian', 'tingkatKeparahan', 'status').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});
