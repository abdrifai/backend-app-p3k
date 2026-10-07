import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './api-docs/swagger.js';
import { globalErrorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import userRoutes from './modules/user/user.routes.js';
import { p3kCsvImportRoutes } from './modules/p3k-csv-import/p3k-csv-import.routes.js';
import { p3kParuhWaktuRoutes } from './modules/p3k-paruh-waktu/p3k-paruh-waktu.routes.js';
import { dataP3kRoutes } from './modules/data-p3k/data-p3k.routes.js';
import { refUnorRoutes } from './modules/ref-unor/ref-unor.routes.js';
import taskRoutes from './modules/task/task.routes.js';
import kegiatanRoutes from './modules/kegiatan/kegiatan.routes.js';
import taskUsulanRoutes from './modules/task-usulan/task-usulan.routes.js';
import { kontrakRoutes } from './modules/kontrak/kontrak.routes.js';
import { perpanjanganRoutes } from './modules/perpanjangan/perpanjangan.routes.js';
import gajiRoutes from './modules/gaji/gaji.routes.js';
import taskFieldConfigRoutes from './modules/task-field-config/task-field-config.routes.js';
import { activityLogRoutes } from './modules/activity-log/activityLog.routes.js';
import backupRoutes from './modules/backup/backup.routes.js';
import roleMenuRoutes from './modules/role-menu/role-menu.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { kategoriMasalahRoutes } from './modules/kategori-masalah/kategori-masalah.routes.js';
import { masalahPegawaiRoutes } from './modules/masalah-pegawai/masalah-pegawai.routes.js';
import { refJenisPensiunRoutes } from './modules/ref-jenis-pensiun/ref-jenis-pensiun.routes.js';
import { pemberhentianRoutes } from './modules/pemberhentian/pemberhentian.routes.js';
import { portalAuthRoutes } from './modules/portal-auth/portal-auth.routes.js';
import { portalRoutes } from './modules/portal/portal.routes.js';
import portalPerbaikanRoutes from './modules/portal-perbaikan/perbaikan.routes.js';
import { verifikasiRoutes } from './modules/verifikasi-perbaikan/verifikasi.routes.js';
import ttePortalRoutes from './modules/tte/tte-portal.routes.js';
import ttePejabatRoutes from './modules/tte/tte-pejabat.routes.js';
import pejabatAdminRoutes from './modules/tte/pejabat-admin.routes.js';
import { authenticate, denyRole } from './middlewares/auth.middleware.js';
import path from 'path';

// Initialize Express
const app = express();

// Global Middlewares
//helmet asli
//app.use(helmet());
//helmet perubahan 
app.use(
  helmet({
    contentSecurityPolicy: false, // Mematikan CSP agar script Swagger bisa jalan
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false, // Menghilangkan error "untrustworthy origin" di log
    frameguard: false // Izinkan embedding preview dokumen PDF di iframe
  })
);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Tambahkan konfigurasi ini
const swaggerOptions = {
    swaggerOptions: {
        url: "/api-docs/swagger.json", // Pastikan path benar
    },
};

// Swagger Documentation Route
//app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Ubah baris app.use Anda menjadi seperti ini:
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        url: "/api-docs/swagger.json",
    },
    customSiteTitle: "App-P3K API Docs"
}));

// Base Route
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Guard khusus staf (menolak role 'pegawai')
const staffGuard = [authenticate, denyRole('pegawai')];

// Import and use routes module here eventually
app.use('/api/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/portal/auth', portalAuthRoutes);
app.use('/api/v1/portal/perbaikan', portalPerbaikanRoutes);
app.use('/api/v1/portal/tte', ttePortalRoutes);
app.use('/api/v1/portal', portalRoutes);
app.use('/api/v1/verifikasi-perbaikan', staffGuard, verifikasiRoutes);
app.use('/api/v1/tte', staffGuard, ttePejabatRoutes);
app.use('/api/v1/pejabat-penandatangan', staffGuard, pejabatAdminRoutes);
app.use('/api/v1/p3k-csv-import', staffGuard, p3kCsvImportRoutes);
app.use('/api/v1/p3k-paruh-waktu', staffGuard, p3kParuhWaktuRoutes);
app.use('/api/v1/data-p3k', staffGuard, dataP3kRoutes);
app.use('/api/v1/ref-unor', staffGuard, refUnorRoutes);
app.use('/api/tasks', staffGuard, taskRoutes);
app.use('/api/kegiatan', staffGuard, kegiatanRoutes);
app.use('/api/tasks-usulan', staffGuard, taskUsulanRoutes);
app.use('/api/v1/kontrak', staffGuard, kontrakRoutes);
app.use('/api/v1/perpanjangan', staffGuard, perpanjanganRoutes);
app.use('/api/v1/gaji', staffGuard, gajiRoutes);
app.use('/api/task-field-configs', staffGuard, taskFieldConfigRoutes);
app.use('/api/v1/activity-logs', staffGuard, activityLogRoutes);
app.use('/api/backup', staffGuard, backupRoutes);
app.use('/api/role-menus', roleMenuRoutes);
app.use('/api/v1/kategori-masalah', staffGuard, kategoriMasalahRoutes);
app.use('/api/v1/masalah-pegawai', staffGuard, masalahPegawaiRoutes);
app.use('/api/v1/ref-jenis-pensiun', staffGuard, refJenisPensiunRoutes);
app.use('/api/v1/pemberhentian', staffGuard, pemberhentianRoutes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
