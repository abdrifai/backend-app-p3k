import { asyncHandler } from '../../middlewares/error.middleware.js';
import { signPassphraseSchema, tolakTteSchema, pejabatPenandatanganSchema } from './tte.validation.js';
import { tteService } from './tte.service.js';

// Controller Pegawai
export const getAntrianPegawai = asyncHandler(async (req, res) => {
  const data = await tteService.getAntrianPegawai(req.pegawai);
  res.status(200).json({
    success: true,
    data,
    message: 'Antrian dokumen TTE pegawai berhasil diambil'
  });
});

export const getPreviewPegawai = asyncHandler(async (req, res) => {
  const data = await tteService.getPreviewDokumenPegawai(req.pegawai, req.params.usulanId);
  res.status(200).json({
    success: true,
    data,
    message: 'Preview dokumen berhasil diambil'
  });
});

export const cekStatusSertifikatPegawai = asyncHandler(async (req, res) => {
  const nik = req.pegawai.nik || req.pegawai.raw?.nik;
  const data = await tteService.cekStatusSertifikat(nik);
  res.status(200).json({
    success: true,
    data,
    message: 'Status sertifikat BSrE berhasil dicek'
  });
});

export const signPegawai = asyncHandler(async (req, res) => {
  const { error, value } = signPassphraseSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const result = await tteService.signPegawai(
    req.pegawai,
    req.user.id,
    req.params.usulanId,
    value.passphrase,
    req.ip
  );

  res.status(200).json({
    success: true,
    data: result,
    message: 'Tanda tangan elektronik pegawai berhasil dibubuhkan'
  });
});

// Controller Pejabat
export const getAntrianPejabat = asyncHandler(async (req, res) => {
  const result = await tteService.getAntrianPejabat(req.user.id, req.query);
  res.status(200).json({
    success: true,
    data: result.data,
    pejabat: result.pejabat,
    pagination: result.pagination,
    message: 'Antrian dokumen penandatangan berhasil diambil'
  });
});

export const signPejabat = asyncHandler(async (req, res) => {
  const { error, value } = signPassphraseSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const result = await tteService.signPejabat(
    req.user.id,
    req.params.usulanId,
    value.passphrase,
    req.ip
  );

  res.status(200).json({
    success: true,
    data: result,
    message: 'Tanda tangan/paraf elektronik pejabat berhasil dibubuhkan'
  });
});

export const tolakPejabat = asyncHandler(async (req, res) => {
  const { error, value } = tolakTteSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const result = await tteService.tolakPejabat(
    req.user.id,
    req.params.usulanId,
    value.catatan,
    req.ip
  );

  res.status(200).json({
    success: true,
    data: result,
    message: 'Penolakan tanda tangan berhasil dicatat'
  });
});

// Controller CRUD Pejabat (Admin)
export const listPejabat = asyncHandler(async (req, res) => {
  const data = await tteService.listPejabat();
  res.status(200).json({
    success: true,
    data,
    message: 'Daftar pejabat penandatangan berhasil diambil'
  });
});

export const createPejabat = asyncHandler(async (req, res) => {
  const { error, value } = pejabatPenandatanganSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  const data = await tteService.createPejabat(value);
  res.status(201).json({
    success: true,
    data,
    message: 'Pejabat penandatangan berhasil ditambahkan'
  });
});

export const updatePejabat = asyncHandler(async (req, res) => {
  const data = await tteService.updatePejabat(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data,
    message: 'Pejabat penandatangan berhasil diperbarui'
  });
});

export const deletePejabat = asyncHandler(async (req, res) => {
  const data = await tteService.deletePejabat(req.params.id);
  res.status(200).json({
    success: true,
    data,
    message: 'Pejabat penandatangan berhasil dinonaktifkan'
  });
});
