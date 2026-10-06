import { asyncHandler } from '../../middlewares/error.middleware.js';
import { buatUsulanSchema, revisiUsulanSchema } from './perbaikan.validation.js';
import { perbaikanService } from './perbaikan.service.js';

export const getAturan = asyncHandler(async (req, res) => {
  const data = perbaikanService.getAturan();
  res.status(200).json({
    success: true,
    data,
    message: 'Aturan usulan perbaikan berhasil diambil'
  });
});

export const getDaftarUsulan = asyncHandler(async (req, res) => {
  const result = await perbaikanService.getDaftarUsulan(req.pegawai, req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    message: 'Daftar usulan perbaikan berhasil diambil'
  });
});

export const getDetailUsulan = asyncHandler(async (req, res) => {
  const data = await perbaikanService.getDetailUsulan(req.pegawai, req.params.id);
  res.status(200).json({
    success: true,
    data,
    message: 'Detail usulan perbaikan berhasil diambil'
  });
});

export const buatUsulan = asyncHandler(async (req, res) => {
  const { error, value } = buatUsulanSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const result = await perbaikanService.buatUsulan(
    req.pegawai,
    req.user.id,
    value,
    req.files || []
  );

  res.status(201).json({
    success: true,
    data: result,
    message: 'Usulan perbaikan data berhasil diajukan'
  });
});

export const revisiUsulan = asyncHandler(async (req, res) => {
  const { error, value } = revisiUsulanSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const result = await perbaikanService.revisiUsulan(
    req.pegawai,
    req.user.id,
    req.params.id,
    value,
    req.files || []
  );

  res.status(200).json({
    success: true,
    data: result,
    message: 'Revisi usulan perbaikan berhasil dikirim'
  });
});

export const batalkanUsulan = asyncHandler(async (req, res) => {
  const result = await perbaikanService.batalkanUsulan(req.pegawai, req.user.id, req.params.id);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Usulan perbaikan berhasil dibatalkan'
  });
});
