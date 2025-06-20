const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const emailService = require('../services/email-service');

const router = express.Router();

// Initialize JWT service
const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  issuer: 'devx-platform',
  audience: 'devx-users',
  expiresIn: '15m',
  refreshExpiresIn: '7d'
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});

// Simple JWT service replacement
const jwtService = {
  generateAccessToken: (payload) => jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn }),
  generateRefreshToken: (payload) => jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.refreshExpiresIn }),
  verifyToken: (token) => jwt.verify(token, jwtConfig.secret)
};

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registration attempts per hour
  message: {
    error: 'Too many registration attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters and contain at least one lowercase letter, uppercase letter, number, and special character'),
  body('full_name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .trim()
    .withMessage('Full name must be between 1 and 255 characters'),
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
];

const validatePasswordResetConfirm = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters and contain at least one lowercase letter, uppercase letter, number, and special character'),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Helper function to get client info
const getClientInfo = (req) => ({
  userAgent: req.get('User-Agent'),
  ipAddress: req.ip || req.connection.remoteAddress
});

// Register endpoint
router.post('/register', registerLimiter, validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { email, username, password, full_name } = req.body;
    const clientInfo = getClientInfo(req);

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists'
      });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        error: 'Username is already taken'
      });
    }

    // Create user
    const user = await User.create({
      email,
      username,
      password,
      full_name
    });

    // Log activity
    await user.logActivity('user.registered', 'user', user.id, {
      registration_method: 'email'
    }, clientInfo.ipAddress, clientInfo.userAgent);

    // Generate tokens
    const payload = {
      userId: user.id,
      email: user.email,
      roles: await user.getRoles().then(roles => roles.map(r => r.name)),
      permissions: await user.getPermissions()
    };

    const tokenPair = jwtService.generateTokenPair(payload);
    const refreshTokenData = await user.createRefreshToken(
      clientInfo.userAgent, 
      clientInfo.ipAddress
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      tokens: {
        access_token: tokenPair.accessToken,
        refresh_token: refreshTokenData.token,
        expires_in: tokenPair.expiresIn,
        token_type: 'Bearer'
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Login endpoint
router.post('/login', authLimiter, validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientInfo = getClientInfo(req);

    // Authenticate user
    const user = await User.authenticate(email, password);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Log activity
    await user.logActivity('user.login', 'user', user.id, {
      login_method: 'email'
    }, clientInfo.ipAddress, clientInfo.userAgent);

    // Generate tokens
    const payload = {
      userId: user.id,
      email: user.email,
      roles: await user.getRoles().then(roles => roles.map(r => r.name)),
      permissions: await user.getPermissions()
    };

    const tokenPair = jwtService.generateTokenPair(payload);
    const refreshTokenData = await user.createRefreshToken(
      clientInfo.userAgent, 
      clientInfo.ipAddress
    );

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      tokens: {
        access_token: tokenPair.accessToken,
        refresh_token: refreshTokenData.token,
        expires_in: tokenPair.expiresIn,
        token_type: 'Bearer'
      }
    });

  } catch (error) {
    if (error.message.includes('locked') || error.message.includes('deactivated')) {
      return res.status(423).json({
        error: error.message
      });
    }

    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token and get user payload
    const getUserPayload = async (userId) => {
      const user = await User.findById(userId);
      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      // Validate the refresh token
      const tokenData = await user.validateRefreshToken(refresh_token);
      if (!tokenData) {
        throw new Error('Invalid or expired refresh token');
      }

      return {
        userId: user.id,
        email: user.email,
        roles: await user.getRoles().then(roles => roles.map(r => r.name)),
        permissions: await user.getPermissions()
      };
    };

    const newTokenPair = await jwtService.refreshAccessToken(refresh_token, getUserPayload);

    res.json({
      tokens: {
        access_token: newTokenPair.accessToken,
        refresh_token: newTokenPair.refreshToken,
        expires_in: newTokenPair.expiresIn,
        token_type: 'Bearer'
      }
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Invalid or expired refresh token'
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      
      try {
        const payload = jwtService.verifyToken(accessToken);
        const user = await User.findById(payload.userId);
        
        if (user && refresh_token) {
          await user.revokeRefreshToken(refresh_token);
          
          // Log activity
          const clientInfo = getClientInfo(req);
          await user.logActivity('user.logout', 'user', user.id, {
            logout_method: 'manual'
          }, clientInfo.ipAddress, clientInfo.userAgent);
        }
      } catch (error) {
        // Token might be expired, but we can still try to revoke refresh token
        logger.warn('Access token verification failed during logout:', error.message);
      }
    }

    res.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Logout from all devices endpoint
router.post('/logout-all', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access token required'
      });
    }

    const accessToken = authHeader.substring(7);
    const payload = jwtService.verifyToken(accessToken);
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    await user.revokeAllRefreshTokens();

    // Log activity
    const clientInfo = getClientInfo(req);
    await user.logActivity('user.logout_all', 'user', user.id, {
      logout_method: 'all_devices'
    }, clientInfo.ipAddress, clientInfo.userAgent);

    res.json({
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Password reset request endpoint
router.post('/password-reset', validatePasswordReset, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    // Always return success to prevent email enumeration
    const successResponse = {
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

    if (!user) {
      return res.json(successResponse);
    }

    const resetToken = await user.createPasswordResetToken();

    // Log activity
    const clientInfo = getClientInfo(req);
    await user.logActivity('user.password_reset_requested', 'user', user.id, {
      reset_method: 'email'
    }, clientInfo.ipAddress, clientInfo.userAgent);

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(user, resetToken);
      logger.info(`Password reset email sent to ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send password reset email to ${email}:`, emailError);
      // Continue anyway - don't fail the request due to email issues
      logger.info(`Password reset token for ${email}: ${resetToken}`);
    }

    res.json(successResponse);

  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Password reset confirmation endpoint
router.post('/password-reset/confirm', validatePasswordResetConfirm, handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body;

    const tokenData = await User.validatePasswordResetToken(token);
    if (!tokenData) {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    const { user, tokenId } = tokenData;

    // Update password
    await user.update({ password });
    await User.markPasswordResetTokenUsed(tokenId);

    // Revoke all refresh tokens for security
    await user.revokeAllRefreshTokens();

    // Log activity
    const clientInfo = getClientInfo(req);
    await user.logActivity('user.password_reset_completed', 'user', user.id, {
      reset_method: 'email'
    }, clientInfo.ipAddress, clientInfo.userAgent);

    res.json({
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Password reset confirmation error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get current user endpoint
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access token required'
      });
    }

    const accessToken = authHeader.substring(7);
    const payload = jwtService.verifyToken(accessToken);
    const user = await User.findById(payload.userId);

    if (!user || !user.is_active) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const roles = await user.getRoles();
    const permissions = await user.getPermissions();

    res.json({
      user: user.toJSON(),
      roles: roles.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description
      })),
      permissions
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access token expired'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid access token'
      });
    }

    logger.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Email verification endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required'
      });
    }

    // Find user by verification token
    const query = 'SELECT * FROM devx.users WHERE email_verification_token = $1';
    const { pool } = require('../../config/database');
    const result = await pool.query(query, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid verification token'
      });
    }

    const user = new User(result.rows[0]);
    await user.verifyEmail();

    // Log activity
    const clientInfo = getClientInfo(req);
    await user.logActivity('user.email_verified', 'user', user.id, {
      verification_method: 'email_token'
    }, clientInfo.ipAddress, clientInfo.userAgent);

    res.json({
      message: 'Email verified successfully'
    });

  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;