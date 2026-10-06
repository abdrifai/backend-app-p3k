export const KATEGORI_PERBAIKAN = {
  DATA_UTAMA: 'DATA_UTAMA',
  RIWAYAT_KELUARGA: 'RIWAYAT_KELUARGA',
  RIWAYAT_KONTRAK: 'RIWAYAT_KONTRAK',
  SK_PENGANGKATAN: 'SK_PENGANGKATAN'
};

export const AKSI_PERBAIKAN = {
  TAMBAH: 'TAMBAH',
  UBAH: 'UBAH',
  HAPUS: 'HAPUS'
};

export const STATUS_PERBAIKAN = {
  DIAJUKAN: 'DIAJUKAN',
  DIPROSES: 'DIPROSES',
  PERLU_PERBAIKAN: 'PERLU_PERBAIKAN',
  DISETUJUI: 'DISETUJUI',
  DITOLAK: 'DITOLAK',
  DIBATALKAN: 'DIBATALKAN'
};

export const ATURAN_PERBAIKAN = {
  [KATEGORI_PERBAIKAN.DATA_UTAMA]: {
    label: 'Data Utama (Kontak & Domisili)',
    aksiDiizinkan: [AKSI_PERBAIKAN.UBAH],
    fieldDiizinkan: ['nomorHp', 'email', 'alamat'],
    fieldLabels: {
      nomorHp: 'Nomor HP / WhatsApp',
      email: 'Email Aktif',
      alamat: 'Alamat Tempat Tinggal'
    },
    lampiranWajib: false,
    keteranganLampiran: 'Lampiran kartu identitas/dokumen pendukung (opsional).'
  },
  [KATEGORI_PERBAIKAN.RIWAYAT_KELUARGA]: {
    label: 'Riwayat Keluarga',
    aksiDiizinkan: [AKSI_PERBAIKAN.TAMBAH, AKSI_PERBAIKAN.UBAH, AKSI_PERBAIKAN.HAPUS],
    fieldDiizinkan: [
      'hubungan',
      'nama',
      'nik',
      'tempatLahir',
      'tanggalLahir',
      'jenisKelamin',
      'pekerjaan',
      'statusHidup',
      'tanggalMenikah',
      'nomorAktaNikah',
      'nomorAktaLahir',
      'isTanggungan'
    ],
    fieldLabels: {
      hubungan: 'Hubungan Keluarga (SUAMI, ISTRI, ANAK, AYAH, IBU)',
      nama: 'Nama Lengkap',
      nik: 'NIK',
      tempatLahir: 'Tempat Lahir',
      tanggalLahir: 'Tanggal Lahir (YYYY-MM-DD)',
      jenisKelamin: 'Jenis Kelamin (L / P)',
      pekerjaan: 'Pekerjaan',
      statusHidup: 'Status Hidup (Aktif/Meninggal)',
      tanggalMenikah: 'Tanggal Menikah (YYYY-MM-DD)',
      nomorAktaNikah: 'Nomor Akta Nikah',
      nomorAktaLahir: 'Nomor Akta Lahir',
      isTanggungan: 'Masuk Tanggungan (Ya/Tidak)'
    },
    lampiranWajib: true,
    keteranganLampiran: 'Wajib melampirkan Kartu Keluarga (KK) dan Akta Nikah / Akta Lahir (PDF/Gambar max 2MB).'
  },
  [KATEGORI_PERBAIKAN.RIWAYAT_KONTRAK]: {
    label: 'Riwayat Kontrak Kerja',
    aksiDiizinkan: [AKSI_PERBAIKAN.TAMBAH, AKSI_PERBAIKAN.UBAH],
    fieldDiizinkan: ['kontrakKe', 'nomorKontrak', 'tanggalMulai', 'tanggalSelesai'],
    fieldLabels: {
      kontrakKe: 'Kontrak Ke-',
      nomorKontrak: 'Nomor Surat Perjanjian Kerja (SPK)',
      tanggalMulai: 'Tanggal Mulai Kontrak (YYYY-MM-DD)',
      tanggalSelesai: 'Tanggal Selesai Kontrak (YYYY-MM-DD)'
    },
    lampiranWajib: true,
    keteranganLampiran: 'Wajib melampirkan scan Surat Perjanjian Kerja / Kontrak (PDF/Gambar max 2MB).'
  },
  [KATEGORI_PERBAIKAN.SK_PENGANGKATAN]: {
    label: 'Riwayat SK Pengangkatan Pertama',
    aksiDiizinkan: [AKSI_PERBAIKAN.UBAH],
    fieldDiizinkan: ['nomorSkCpns', 'tanggalSkCpns', 'tmtCpns'],
    fieldLabels: {
      nomorSkCpns: 'Nomor SK Pengangkatan',
      tanggalSkCpns: 'Tanggal SK (YYYY-MM-DD)',
      tmtCpns: 'TMT Pengangkatan Pertama (YYYY-MM-DD)'
    },
    lampiranWajib: true,
    keteranganLampiran: 'Wajib melampirkan scan SK Pengangkatan Pertama (PDF/Gambar max 2MB). Catatan: TMT memengaruhi masa kerja.'
  }
};

export const TRANSISI_STATUS_PERBAIKAN = {
  [STATUS_PERBAIKAN.DIAJUKAN]: [STATUS_PERBAIKAN.DIPROSES, STATUS_PERBAIKAN.DIBATALKAN],
  [STATUS_PERBAIKAN.DIPROSES]: [
    STATUS_PERBAIKAN.DISETUJUI,
    STATUS_PERBAIKAN.DITOLAK,
    STATUS_PERBAIKAN.PERLU_PERBAIKAN
  ],
  [STATUS_PERBAIKAN.PERLU_PERBAIKAN]: [STATUS_PERBAIKAN.DIAJUKAN],
  [STATUS_PERBAIKAN.DISETUJUI]: [],
  [STATUS_PERBAIKAN.DITOLAK]: [],
  [STATUS_PERBAIKAN.DIBATALKAN]: []
};
