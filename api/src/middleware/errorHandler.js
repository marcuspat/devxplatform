const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'devx-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ] : [])
  ],
});

// Error handler middleware
const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details || error.message
    });
  }

  if (error.name === 'UnauthorizedError' || error.message.includes('jwt')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (error.name === 'ForbiddenError') {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden'
    });
  }

  if (error.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }

  if (error.name === 'ConflictError') {
    return res.status(409).json({
      success: false,
      message: 'Resource conflict'
    });
  }

  // Database errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique constraint violation
        return res.status(409).json({
          success: false,
          message: 'Resource already exists'
        });
      case '23503': // Foreign key constraint violation
        return res.status(400).json({
          success: false,
          message: 'Invalid reference to related resource'
        });
      case '23502': // Not null constraint violation
        return res.status(400).json({
          success: false,
          message: 'Required field is missing'
        });
      default:
        break;
    }
  }

  // Rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retry_after: error.retryAfter
    });
  }

  // Default server error
  const statusCode = error.statusCode || error.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  });
};

// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error classes
class APIError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'APIError';
  }
}

class ValidationError extends APIError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class UnauthorizedError extends APIError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends APIError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends APIError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  logger,
  APIError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};