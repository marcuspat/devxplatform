const express = require('express');
const router = express.Router();

// Simple auth endpoints without bcrypt dependency for testing
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock successful login
  if (email && password) {
    res.json({
      success: true,
      tokens: {
        access_token: 'mock-jwt-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        expires_in: 3600,
        token_type: 'Bearer'
      },
      user: {
        id: '1',
        email: email,
        username: email.split('@')[0],
        full_name: 'Test User',
        is_active: true,
        is_admin: false,
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } else {
    res.status(400).json({
      error: 'Email and password are required'
    });
  }
});

router.post('/register', (req, res) => {
  const { email, username, password } = req.body;
  
  if (email && username && password) {
    res.json({
      success: true,
      message: 'User registered successfully',
      tokens: {
        access_token: 'mock-jwt-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        expires_in: 3600,
        token_type: 'Bearer'
      },
      user: {
        id: Date.now().toString(),
        email: email,
        username: username,
        is_active: true,
        is_admin: false,
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } else {
    res.status(400).json({
      error: 'Email, username and password are required'
    });
  }
});

router.get('/me', (req, res) => {
  // Mock current user
  res.json({
    user: {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User',
      is_active: true,
      is_admin: false,
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    roles: [],
    permissions: []
  });
});

router.get('/validate', (req, res) => {
  // Mock token validation
  res.json({
    valid: true,
    user_id: '1'
  });
});

module.exports = router;