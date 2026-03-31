import logger from '../config/logger.js';

/**
 * Async Handler Wrapper
 * Catch errors in async functions and passes them to the next middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global Error Handler Middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  
  // Exclude stack trace in production
  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
    data: null,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  logger.error(`[${req.method}] ${req.url} - ${statusCode} - ${err.message}`, {
    stack: err.stack,
  });

  res.status(statusCode).json(response);
};

/**
 * Not Found Handler Middleware
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};
