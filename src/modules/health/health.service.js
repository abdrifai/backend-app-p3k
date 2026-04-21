import { checkDatabaseConnection } from './health.repository.js';

export const getHealthStatus = async () => {
  try {
    await checkDatabaseConnection();
    return {
      success: true,
      message: 'App-P3K API and Database are running.',
      data: { database: 'Connected' },
    };
  } catch (error) {
    const err = new Error('App-P3K API is running, but Database is DISCONNECTED.');
    err.statusCode = 500;
    // Pilihan untuk melampirkan log tambahan jika perlu
    err.details = error.message;
    throw err;
  }
};
