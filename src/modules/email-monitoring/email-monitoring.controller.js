import emailMonitoringService from './email-monitoring.service.js';
import { asyncHandler } from '../../middlewares/error.middleware.js';

class EmailMonitoringController {
  /**
   * Mengambil statistik ringkasan kuota pengiriman email
   */
  getQuotaSummary = asyncHandler(async (req, res) => {
    const data = await emailMonitoringService.getQuotaSummary();
    res.status(200).json({
      success: true,
      message: 'Data statistik kuota email berhasil diambil',
      data,
    });
  });

  /**
   * Menguji koneksi SMTP server secara on-demand
   */
  testConnection = asyncHandler(async (req, res) => {
    const result = await emailMonitoringService.testSmtpConnection();
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        timestamp: new Date().toISOString(),
      },
    });
  });
}

export default new EmailMonitoringController();

