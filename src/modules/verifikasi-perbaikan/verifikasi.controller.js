import { asyncHandler } from '../../middlewares/error.middleware.js';
import {
  queryInboxSchema,
  prosesSchema,
  perluPerbaikanSchema,
  tolakSchema,
  setujuiSchema
} from './verifikasi.validation.js';
import { verifikasiService } from './verifikasi.service.js';

export const getInbox = asyncHandler(async (req, res) => {
  const { error, value } = queryInboxSchema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const result = await verifikasiService.getInbox(value);
  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    message: 'Inbox usulan perbaikan berhasil diambil'
  });
});

export const getStatistik = asyncHandler(async (req, res) => {
  const data = await verifikasiService.getStatistik();
  res.status(200).json({
    success: true,
    data,
    message: 'Statistik usulan perbaikan berhasil diambil'
  });
});

export const getDetail = asyncHandler(async (req, res) => {
  const data = await verifikasiService.getDetail(req.params.id);
  res.status(200).json({
    success: true,
    data,
    message: 'Detail usulan perbaikan berhasil diambil'
  });
});

export const prosesUsulan = asyncHandler(async (req, res) => {
  const { error, value } = prosesSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const result = await verifikasiService.prosesUsulan(req.params.id, req.user.id, value.catatan);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Status usulan berhasil diubah menjadi DIPROSES'
  });
});

export const mintaPerbaikan = asyncHandler(async (req, res) => {
  const { error, value } = perluPerbaikanSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const result = await verifikasiService.mintaPerbaikan(req.params.id, req.user.id, value.catatan);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Usulan berhasil dikembalikan ke pegawai untuk perbaikan'
  });
});

export const tolakUsulan = asyncHandler(async (req, res) => {
  const { error, value } = tolakSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const result = await verifikasiService.tolakUsulan(req.params.id, req.user.id, value.catatan);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Usulan perbaikan data berhasil ditolak'
  });
});

export const setujuiUsulan = asyncHandler(async (req, res) => {
  const { error, value } = setujuiSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const result = await verifikasiService.setujuiUsulan(req.params.id, req.user.id, value?.catatan);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Usulan perbaikan berhasil disetujui dan diterapkan ke data pegawai'
  });
});
