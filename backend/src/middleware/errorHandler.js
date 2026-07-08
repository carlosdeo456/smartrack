const { isProduction } = require('../config/env');

/**
 * Centralized error handler.
 * - Development: exposes database and internal error details for debugging.
 * - Production: masks internal/DB errors with a generic message.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const isDbError = err.code && typeof err.code === 'string' && err.code.startsWith('23');
  const isOperational = err.isOperational === true;

  let message = err.message || 'Internal Server Error';

  if (isProduction && (isDbError || !isOperational || statusCode === 500)) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  if (!isProduction) {
    console.error(`[${req.method} ${req.originalUrl}]`, err.stack || err);
  } else {
    console.error(`[${req.method} ${req.originalUrl}]`, message);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      status: statusCode,
      ...(isProduction ? {} : { detail: err.message, code: err.code }),
    },
  });
}

module.exports = errorHandler;
