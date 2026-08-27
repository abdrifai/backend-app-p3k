import 'dotenv/config';
import app from './src/app.js';
import logger from './src/config/logger.js';
import prisma from './src/config/database.js';
import initScheduler from './src/config/scheduler.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Database check connection can simply be a raw query or connect
    await prisma.$connect();
    logger.info('Database connected successfully via Prisma.');

    // Start Server
    app.listen(PORT, () => {
      logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);

      // Inisialisasi scheduler backup otomatis
      initScheduler();
    });
  } catch (error) {
    logger.error('Failed to start the server: ', error);
    process.exit(1);
  }
};

startServer();

// Graceful Shutdown on uncaught exceptions
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});
