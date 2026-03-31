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
import { dataP3kRoutes } from './modules/data-p3k/data-p3k.routes.js';
import { refUnorRoutes } from './modules/ref-unor/ref-unor.routes.js';
import taskRoutes from './modules/task/task.routes.js';
import taskUsulanRoutes from './modules/task-usulan/task-usulan.routes.js';
import { kontrakRoutes } from './modules/kontrak/kontrak.routes.js';
import { perpanjanganRoutes } from './modules/perpanjangan/perpanjangan.routes.js';
import gajiRoutes from './modules/gaji/gaji.routes.js';
import taskFieldConfigRoutes from './modules/task-field-config/task-field-config.routes.js';
import { activityLogRoutes } from './modules/activity-log/activityLog.routes.js';

// Initialize Express
const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Base Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'App-P3K API is running.',
    data: null,
  });
});

// Import and use routes module here eventually
app.use('/api/users', userRoutes);
app.use('/api/v1/p3k-csv-import', p3kCsvImportRoutes);
app.use('/api/v1/data-p3k', dataP3kRoutes);
app.use('/api/v1/ref-unor', refUnorRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tasks-usulan', taskUsulanRoutes);
app.use('/api/v1/kontrak', kontrakRoutes);
app.use('/api/v1/perpanjangan', perpanjanganRoutes);
app.use('/api/v1/gaji', gajiRoutes);
app.use('/api/task-field-configs', taskFieldConfigRoutes);
app.use('/api/v1/activity-logs', activityLogRoutes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
