// Simple authentication middleware without bcrypt dependency
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No valid token provided.'
    });
  }
  
  // Mock authentication - in production this would verify JWT
  const token = authHeader.substring(7);
  if (token) {
    // Mock user data
    req.user = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      is_admin: false
    };
    next();
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Optional auth - allows requests with or without auth
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token) {
      // Mock user data
      req.user = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        is_admin: false
      };
    }
  }
  // Continue regardless of auth status
  next();
};

module.exports = {
  authenticate,
  auth: authenticate, // Alias for compatibility
  adminOnly,
  optionalAuth
};