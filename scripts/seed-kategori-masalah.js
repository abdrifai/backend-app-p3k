import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  {
    kode: 'DISIPLIN',
    nama: 'Disiplin & Kehadiran',
    deskripsi: 'Pelanggaran jam kerja, ketidakhadiran tanpa izin/keterangan, absensi tidak sesuai aturan, atau kedisiplinan umum.',
    warnaBadge: '#ef4444' // red
  },
  {
    kode: 'KINERJA',
    nama: 'Kinerja & Evaluasi',
    deskripsi: 'Penilaian capaian kinerja tidak memenuhi target, ketidakmampuan menyelesaikan tugas pokok, kelalaian dalam pelaksanaan tugas.',
    warnaBadge: '#f59e0b' // amber
  },
  {
    kode: 'ADMINISTRASI',
    nama: 'Administrasi & Berkas',
    deskripsi: 'Ketidaklengkapan dokumen kepegawaian, keterlambatan pelaporan administrasi, pemalsuan/ketidaksesuaian data berkas.',
    warnaBadge: '#3b82f6' // blue
  },
  {
    kode: 'KONTRAK',
    nama: 'Pelanggaran Kontrak',
    deskripsi: 'Pelanggaran klausul perjanjian kerja (PK), wanprestasi tugas sesuai SK, bekerja di luar ketentuan instansi.',
    warnaBadge: '#8b5cf6' // purple
  },
  {
    kode: 'ETIKA',
    nama: 'Etika & Kode Perilaku',
    deskripsi: 'Pelanggaran kode etik profesi, perilaku tidak pantas di lingkungan kerja, konflik antarrekan/atasan/masyarakat.',
    warnaBadge: '#ec4899' // pink
  },
  {
    kode: 'LAINNYA',
    nama: 'Lain-lain',
    deskripsi: 'Permasalahan atau catatan khusus lainnya yang belum terakomodasi dalam kategori di atas.',
    warnaBadge: '#64748b' // slate
  }
];

async function main() {
  console.log('Seeding Kategori Masalah...');
  for (const cat of defaultCategories) {
    const existing = await prisma.kategoriMasalah.findUnique({
      where: { kode: cat.kode }
    });

    if (!existing) {
      await prisma.kategoriMasalah.create({
        data: cat
      });
      console.log(`Created category: ${cat.nama}`);
    } else {
      console.log(`Category already exists: ${cat.nama}`);
    }
  }
  console.log('Seeding Kategori Masalah completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
