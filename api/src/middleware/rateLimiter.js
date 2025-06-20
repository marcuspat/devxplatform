const rateLimit = require('express-rate-limit');
const { logger } = require('./errorHandler');

// Basic rate limiter for all requests
const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.API_RATE_LIMIT || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retry_after: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP, please try again later.',
      retry_after: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Generate endpoint rate limiter (more restrictive)
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 service generations per hour
  message: {
    success: false,
    message: 'Too many service generation requests, please try again later.'
  },
  handler: (req, res) => {
    logger.warn('Generate rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      user: req.user ? req.user.id : 'anonymous'
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many service generation requests from this IP, please try again later.',
      retry_after: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// User-specific rate limiter (for authenticated users)
const createUserLimiter = (windowMs = 15 * 60 * 1000, max = 200) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise fall back to IP
      return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    },
    message: {
      success: false,
      message: 'Too many requests, please try again later.'
    },
    handler: (req, res) => {
      logger.warn('User rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        user: req.user ? req.user.id : 'anonymous',
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        retry_after: Math.round(req.rateLimit.resetTime / 1000)
      });
    }
  });
};

// Heavy operation limiter (for resource-intensive operations)
const heavyOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Very restrictive for heavy operations
  keyGenerator: (req) => {
    return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  },
  message: {
    success: false,
    message: 'Too many resource-intensive operations, please try again later.'
  },
  handler: (req, res) => {
    logger.warn('Heavy operation rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      user: req.user ? req.user.id : 'anonymous',
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many resource-intensive operations, please try again later.',
      retry_after: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

module.exports = {
  basicLimiter,
  authLimiter,
  generateLimiter,
  heavyOperationLimiter,
  createUserLimiter
};