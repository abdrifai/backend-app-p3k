import prisma from '../src/config/database.js';

const seedFields = [
  // Identitas
  { fieldName: 'nipBaru', label: 'NIP Baru', inputType: 'text', groupName: 'Identitas', sortOrder: 2 },
  { fieldName: 'nama', label: 'Nama Lengkap', inputType: 'text', groupName: 'Identitas', sortOrder: 3 },
  { fieldName: 'gelarDepan', label: 'Gelar Depan', inputType: 'text', groupName: 'Identitas', sortOrder: 4 },
  { fieldName: 'gelarBelakang', label: 'Gelar Belakang', inputType: 'text', groupName: 'Identitas', sortOrder: 5 },
  { fieldName: 'tempatLahirNama', label: 'Tempat Lahir', inputType: 'text', groupName: 'Identitas', sortOrder: 6 },
  { fieldName: 'tanggalLahir', label: 'Tanggal Lahir', inputType: 'date', groupName: 'Identitas', sortOrder: 7 },
  { fieldName: 'jenisKelamin', label: 'Jenis Kelamin', inputType: 'text', groupName: 'Identitas', sortOrder: 8 },
  { fieldName: 'agamaNama', label: 'Agama', inputType: 'text', groupName: 'Identitas', sortOrder: 10 },
  { fieldName: 'jenisKawinNama', label: 'Status Kawin', inputType: 'text', groupName: 'Identitas', sortOrder: 12 },
  { fieldName: 'nik', label: 'NIK', inputType: 'text', groupName: 'Identitas', sortOrder: 13 },

  // Kontak
  { fieldName: 'nomorHp', label: 'Nomor HP', inputType: 'text', groupName: 'Kontak', sortOrder: 14 },
  { fieldName: 'email', label: 'Email Pribadi', inputType: 'text', groupName: 'Kontak', sortOrder: 15 },
  { fieldName: 'emailGov', label: 'Email Pemerintah', inputType: 'text', groupName: 'Kontak', sortOrder: 16 },
  { fieldName: 'alamat', label: 'Alamat', inputType: 'text', groupName: 'Kontak', sortOrder: 17 },
  { fieldName: 'npwpNomor', label: 'NPWP', inputType: 'text', groupName: 'Kontak', sortOrder: 18 },
  { fieldName: 'bpjs', label: 'BPJS', inputType: 'text', groupName: 'Kontak', sortOrder: 19 },

  // Kepegawaian
  { fieldName: 'kedudukanHukumNama', label: 'Kedudukan Hukum', inputType: 'text', groupName: 'Kepegawaian', sortOrder: 21 },
  { fieldName: 'kartuAsnVirtual', label: 'Kartu ASN Virtual', inputType: 'text', groupName: 'Kepegawaian', sortOrder: 22 },
  { fieldName: 'nomorSkCpns', label: 'Nomor SK CPNS', inputType: 'text', groupName: 'Kepegawaian', sortOrder: 23 },
  { fieldName: 'tanggalSkCpns', label: 'Tanggal SK CPNS', inputType: 'date', groupName: 'Kepegawaian', sortOrder: 24 },
  { fieldName: 'tmtCpns', label: 'TMT CPNS', inputType: 'date', groupName: 'Kepegawaian', sortOrder: 25 },
  { fieldName: 'golAwalNama', label: 'Golongan Awal', inputType: 'text', groupName: 'Kepegawaian', sortOrder: 27 },
  { fieldName: 'golAkhirNama', label: 'Golongan Akhir', inputType: 'text', groupName: 'Kepegawaian', sortOrder: 29 },
  { fieldName: 'tmtGolongan', label: 'TMT Golongan', inputType: 'date', groupName: 'Kepegawaian', sortOrder: 30 },
  { fieldName: 'mkTahun', label: 'Masa Kerja (Tahun)', inputType: 'text', groupName: 'Kepegawaian', sortOrder: 31 },
  { fieldName: 'mkBulan', label: 'Masa Kerja (Bulan)', inputType: 'text', groupName: 'Kepegawaian', sortOrder: 32 },

  // Jabatan
  { fieldName: 'jenisJabatanNama', label: 'Jenis Jabatan', inputType: 'text', groupName: 'Jabatan', sortOrder: 34 },
  { fieldName: 'jabatanNama', label: 'Nama Jabatan', inputType: 'text', groupName: 'Jabatan', sortOrder: 36 },
  { fieldName: 'tmtJabatan', label: 'TMT Jabatan', inputType: 'date', groupName: 'Jabatan', sortOrder: 37 },

  // Pendidikan
  { fieldName: 'tingkatPendidikanNama', label: 'Tingkat Pendidikan', inputType: 'text', groupName: 'Pendidikan', sortOrder: 39 },
  { fieldName: 'pendidikanNama', label: 'Nama Pendidikan', inputType: 'text', groupName: 'Pendidikan', sortOrder: 41 },
  { fieldName: 'tahunLulus', label: 'Tahun Lulus', inputType: 'text', groupName: 'Pendidikan', sortOrder: 42 },

  // Unit Kerja
  { fieldName: 'unorNama', label: 'Unit Organisasi', inputType: 'text', groupName: 'Unit Kerja', sortOrder: 44 },
  { fieldName: 'unorIndukId', label: 'Unit Kerja Induk', inputType: 'search', groupName: 'Unit Kerja', sortOrder: 45, isActive: true },


  // Lainnya
  { fieldName: 'isValidNik', label: 'Status Validasi NIK', inputType: 'text', groupName: 'Lainnya', sortOrder: 46 },
  { fieldName: 'flagIkd', label: 'Flag IKD', inputType: 'text', groupName: 'Lainnya', sortOrder: 47 },
];

async function main() {
  console.log('Seeding TaskFieldConfig...');
  
  for (const field of seedFields) {
    await prisma.taskFieldConfig.upsert({
      where: { fieldName: field.fieldName },
      update: { label: field.label, inputType: field.inputType, groupName: field.groupName, sortOrder: field.sortOrder },
      create: { ...field, isActive: field.isActive || false },
    });
  }

  console.log(`Seeded ${seedFields.length} field configs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
