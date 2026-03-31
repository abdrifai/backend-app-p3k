import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT 
      u.nipBaru as nip,
      u.nama as namaUtama,
      u.unorNama as unorUtama,
      i.nama as namaImport,
      i.unorNama as unorImport,
      CASE 
        WHEN i.nipBaru IS NULL THEN 'Tidak Ada di Import'
        WHEN u.nama != i.nama OR u.unorNama != i.unorNama THEN 'Data Berbeda'
        ELSE 'Error'
      END as statusPerbedaan
    FROM data_p3k u
    LEFT JOIN p3k_csv_imports i ON u.nipBaru = i.nipBaru
    WHERE i.nipBaru IS NULL OR u.nama != i.nama OR u.unorNama != i.unorNama

    UNION ALL

    SELECT 
      i.nipBaru as nip,
      u.nama as namaUtama,
      u.unorNama as unorUtama,
      i.nama as namaImport,
      i.unorNama as unorImport,
      'Baru di Import' as statusPerbedaan
    FROM p3k_csv_imports i
    LEFT JOIN data_p3k u ON i.nipBaru = u.nipBaru
    WHERE u.nipBaru IS NULL
    
    ORDER BY nip ASC
    LIMIT 10 OFFSET 0
  `;
  console.log(result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
