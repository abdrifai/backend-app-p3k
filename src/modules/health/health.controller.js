import { asyncHandler } from '../../middlewares/error.middleware.js';
import { getHealthStatus } from './health.service.js';

export const checkHealth = asyncHandler(async (req, res) => {
  const result = await getHealthStatus();
  
  // Return consistent JSON format
  res.status(200).json(result);
});
