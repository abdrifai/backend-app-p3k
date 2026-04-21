import prisma from '../../config/database.js';

export const checkDatabaseConnection = async () => {
  return await prisma.$queryRaw`SELECT 1`;
};
