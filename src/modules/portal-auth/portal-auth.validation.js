import Joi from 'joi';

export const cekPegawaiSchema = Joi.object({
  nipBaru: Joi.string().trim().required().messages({
    'string.empty': 'NIP wajib diisi',
    'any.required': 'NIP wajib diisi'
  }),
  nik: Joi.string().trim().required().messages({
    'string.empty': 'NIK wajib diisi',
    'any.required': 'NIK wajib diisi'
  }),
  tanggalLahir: Joi.string().trim().required().messages({
    'string.empty': 'Tanggal lahir wajib diisi',
    'any.required': 'Tanggal lahir wajib diisi'
  })
});

export const kirimOtpSchema = Joi.object({
  nipBaru: Joi.string().trim().required().messages({
    'string.empty': 'NIP wajib diisi',
    'any.required': 'NIP wajib diisi'
  }),
  nik: Joi.string().trim().required().messages({
    'string.empty': 'NIK wajib diisi',
    'any.required': 'NIK wajib diisi'
  }),
  tanggalLahir: Joi.string().trim().required().messages({
    'string.empty': 'Tanggal lahir wajib diisi',
    'any.required': 'Tanggal lahir wajib diisi'
  }),
  email: Joi.string().email().trim().required().messages({
    'string.email': 'Format email tidak valid',
    'string.empty': 'Email wajib diisi',
    'any.required': 'Email wajib diisi'
  })
});

export const verifikasiOtpSchema = Joi.object({
  nipBaru: Joi.string().trim().required().messages({
    'string.empty': 'NIP wajib diisi',
    'any.required': 'NIP wajib diisi'
  }),
  otp: Joi.string().trim().length(6).required().messages({
    'string.length': 'Kode OTP harus berupa 6 digit angka',
    'string.empty': 'Kode OTP wajib diisi',
    'any.required': 'Kode OTP wajib diisi'
  }),
  password: Joi.string().min(8).regex(/^(?=.*[a-zA-Z])(?=.*\d)/).required().messages({
    'string.min': 'Password minimal 8 karakter',
    'string.pattern.base': 'Password harus mengandung kombinasi huruf dan angka',
    'string.empty': 'Password wajib diisi',
    'any.required': 'Password wajib diisi'
  }),
  konfirmasiPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Konfirmasi password tidak cocok dengan password',
    'string.empty': 'Konfirmasi password wajib diisi',
    'any.required': 'Konfirmasi password wajib diisi'
  })
});
