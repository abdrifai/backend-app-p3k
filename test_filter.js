import prisma from './src/config/database.js';

async function testFilter() {
  const unitToSearch = 'KESEHATAN'; // adjust based on your data
  
  console.log('Testing filter for unitKerja:', unitToSearch);
  
  const results = await prisma.dataP3k.findMany({
    where: {
      isDeleted: false,
      unorInduk: {
        nama: {
          contains: unitToSearch
        }
      }
    },
    include: {
      unorInduk: true
    },
    take: 5
  });
  
  console.log('Results found:', results.length);
  results.forEach(r => {
    console.log(`- ${r.nama} (Unor Induk: ${r.unorInduk?.nama})`);
  });

  const total = await prisma.dataP3k.count({
    where: {
      isDeleted: false,
      unorInduk: {
        nama: {
          contains: unitToSearch
        }
      }
    }
  });
  console.log('Total count for filter:', total);
  
  // Test empty unorIndukId
  const empty = await prisma.dataP3k.count({
    where: {
      isDeleted: false,
      unorIndukId: null
    }
  });
  console.log('Total with null unorIndukId:', empty);
}

testFilter().catch(console.error).finally(() => prisma.$disconnect());
