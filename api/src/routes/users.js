const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { createJWTService } = require('../../../shared/security/auth/jwt');
const { jwtAuthMiddleware, requireRole, requirePermission } = require('../../../shared/security/auth/jwt');
const { Logger } = require('../../../shared/observability/logging/logger');

const router = express.Router();

// Initialize JWT service
const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  issuer: 'devx-platform',
  audience: 'devx-users',
  expiresIn: '15m',
  refreshExpiresIn: '7d'
};

const logger = new Logger('users');
const jwtService = createJWTService(jwtConfig, logger);

// Apply authentication middleware to all routes
router.use(jwtAuthMiddleware(jwtService));

// Validation middleware
const validateProfileUpdate = [
  body('full_name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .trim()
    .withMessage('Full name must be between 1 and 255 characters'),
  body('avatar_url')
    .optional()
    .isURL()
    .withMessage('Avatar URL must be a valid URL'),
];

const validatePasswordChange = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters and contain at least one lowercase letter, uppercase letter, number, and special character'),
];

const validateUserUpdate = [
  body('full_name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .trim()
    .withMessage('Full name must be between 1 and 255 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('is_admin')
    .optional()
    .isBoolean()
    .withMessage('is_admin must be a boolean'),
];

const validateRoleAssignment = [
  body('role')
    .notEmpty()
    .isIn(['admin', 'developer', 'viewer'])
    .withMessage('Role must be one of: admin, developer, viewer'),
  body('expires_at')
    .optional()
    .isISO8601()
    .withMessage('expires_at must be a valid ISO 8601 date'),
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

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
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
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Update current user profile
router.put('/profile', validateProfileUpdate, handleValidationErrors, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const { full_name, avatar_url } = req.body;
    const updates = {};
    
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    await user.update(updates);

    // Log activity
    const clientInfo = getClientInfo(req);
    await user.logActivity('user.profile_updated', 'user', user.id, {
      updated_fields: Object.keys(updates)
    }, clientInfo.ipAddress, clientInfo.userAgent);

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Change password
router.put('/password', validatePasswordChange, handleValidationErrors, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const { current_password, new_password } = req.body;

    // Verify current password
    const isValid = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isValid) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    // Update password
    await user.update({ password: new_password });

    // Revoke all refresh tokens for security
    await user.revokeAllRefreshTokens();

    // Log activity
    const clientInfo = getClientInfo(req);
    await user.logActivity('user.password_changed', 'user', user.id, {
      change_method: 'self_service'
    }, clientInfo.ipAddress, clientInfo.userAgent);

    res.json({
      message: 'Password changed successfully. Please log in again.'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get user activity logs
router.get('/activity', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT action, resource_type, resource_id, details, ip_address, created_at
      FROM devx.activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM devx.activity_logs
      WHERE user_id = $1
    `;

    const { pool } = require('../../config/database');
    const [logsResult, countResult] = await Promise.all([
      pool.query(query, [req.user.userId, limit, offset]),
      pool.query(countQuery, [req.user.userId])
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      logs: logsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get activity logs error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get user sessions (refresh tokens)
router.get('/sessions', async (req, res) => {
  try {
    const query = `
      SELECT id, user_agent, ip_address, created_at, expires_at,
             CASE WHEN revoked_at IS NOT NULL THEN true ELSE false END as is_revoked
      FROM devx.refresh_tokens
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const { pool } = require('../../config/database');
    const result = await pool.query(query, [req.user.userId]);

    res.json({
      sessions: result.rows
    });

  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Revoke a specific session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const query = `
      UPDATE devx.refresh_tokens 
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
    `;

    const { pool } = require('../../config/database');
    const result = await pool.query(query, [sessionId, req.user.userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Session not found or already revoked'
      });
    }

    // Log activity
    const clientInfo = getClientInfo(req);
    await user.logActivity('user.session_revoked', 'refresh_token', sessionId, {
      revoke_method: 'manual'
    }, clientInfo.ipAddress, clientInfo.userAgent);

    res.json({
      message: 'Session revoked successfully'
    });

  } catch (error) {
    logger.error('Revoke session error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Delete account (deactivate)
router.delete('/account', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Deactivate account
    await user.update({ is_active: false });

    // Revoke all refresh tokens
    await user.revokeAllRefreshTokens();

    // Log activity
    const clientInfo = getClientInfo(req);
    await user.logActivity('user.account_deleted', 'user', user.id, {
      delete_method: 'self_service'
    }, clientInfo.ipAddress, clientInfo.userAgent);

    res.json({
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Admin endpoints - require admin role
router.use(requireRole('admin'));

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (email ILIKE $${paramIndex} OR username ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status === 'active') {
      whereClause += ` AND is_active = true`;
    } else if (status === 'inactive') {
      whereClause += ` AND is_active = false`;
    }

    const query = `
      SELECT id, email, username, full_name, avatar_url, is_active, is_admin, 
             email_verified, last_login_at, created_at, updated_at
      FROM devx.users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM devx.users
      ${whereClause}
    `;

    queryParams.push(limit, offset);

    const { pool } = require('../../config/database');
    const [usersResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      users: usersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get specific user (admin only)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
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
    logger.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Update user (admin only)
router.put('/:userId', validateUserUpdate, handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const { full_name, is_active, is_admin } = req.body;
    const updates = {};
    
    if (full_name !== undefined) updates.full_name = full_name;
    if (is_active !== undefined) updates.is_active = is_active;
    if (is_admin !== undefined) updates.is_admin = is_admin;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    await user.update(updates);

    // Log activity
    const adminUser = await User.findById(req.user.userId);
    const clientInfo = getClientInfo(req);
    await adminUser.logActivity('admin.user_updated', 'user', user.id, {
      updated_fields: Object.keys(updates),
      target_user: user.email
    }, clientInfo.ipAddress, clientInfo.userAgent);

    res.json({
      message: 'User updated successfully',
      user: user.toJSON()
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Assign role to user (admin only)
router.post('/:userId/roles', validateRoleAssignment, handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, expires_at } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const expiresAt = expires_at ? new Date(expires_at) : null;
    await user.assignRole(role, req.user.userId, expiresAt);

    // Log activity
    const adminUser = await User.findById(req.user.userId);
    const clientInfo = getClientInfo(req);
    await adminUser.logActivity('admin.role_assigned', 'user', user.id, {
      assigned_role: role,
      target_user: user.email,
      expires_at: expiresAt
    }, clientInfo.ipAddress, clientInfo.userAgent);

    res.json({
      message: `Role ${role} assigned successfully`
    });

  } catch (error) {
    logger.error('Assign role error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Remove role from user (admin only)
router.delete('/:userId/roles/:roleName', async (req, res) => {
  try {
    const { userId, roleName } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    await user.removeRole(roleName);

    // Log activity
    const adminUser = await User.findById(req.user.userId);
    const clientInfo = getClientInfo(req);
    await adminUser.logActivity('admin.role_removed', 'user', user.id, {
      removed_role: roleName,
      target_user: user.email
    }, clientInfo.ipAddress, clientInfo.userAgent);

    res.json({
      message: `Role ${roleName} removed successfully`
    });

  } catch (error) {
    logger.error('Remove role error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get user activity logs (admin only)
router.get('/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT action, resource_type, resource_id, details, ip_address, user_agent, created_at
      FROM devx.activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM devx.activity_logs
      WHERE user_id = $1
    `;

    const { pool } = require('../../config/database');
    const [logsResult, countResult] = await Promise.all([
      pool.query(query, [userId, limit, offset]),
      pool.query(countQuery, [userId])
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      logs: logsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Get user activity logs error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;