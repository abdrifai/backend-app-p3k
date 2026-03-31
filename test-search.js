import prisma from './src/config/database.js';

async function test() {
  const skip = 0;
  const take = 10;
  const search = "A";
  const where = { AND: [{ isDeleted: false }] };

  if (search) {
    where.AND.push({
      dataP3k: {
        OR: [
          { nama: { contains: search } },
          { nipBaru: { contains: search } }
        ]
      }
    });
  }

  try {
    const data = await prisma.usulanPerpanjangan.findMany({
      where,
      skip,
      take,
      include: {
        dataP3k: {
          select: { id: true, nipBaru: true, nama: true }
        }
      }
    });
    console.log("Data length:", data.length);
    console.log("Data:", data);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
