const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import database
const { initDatabase } = require('../config/database');
const MigrationRunner = require('./migrations');

// Import middleware
const { errorHandler, notFoundHandler, logger } = require('./middleware/errorHandler');
const { basicLimiter, authLimiter, generateLimiter } = require('./middleware/rateLimiter');

// Import Redis queue functionality
const config = require('./config');
// const { createRedisConnection, closeRedisConnection, isRedisConnected } = require('./config/redis'); // Temporarily disabled
// const { serverAdapter } = require('./dashboard/bullBoard'); // Commented out - Bull Board not available

// Import routes
const authRoutes = require('./routes/auth-simple'); // Using simple auth without bcrypt
const templatesRoutes = require('./routes/templates');
const projectsRoutes = require('./routes/projects');
const servicesRoutes = require('./routes/services');
const generateRoutes = require('./routes/generate');
const jobRoutes = require('./routes/jobs');
const costEstimateRoutes = require('./routes/cost-estimate');
const costAnalyticsRoutes = require('./routes/cost-analytics-simple'); // Using simplified version
const statusRoutes = require('./routes/status');
const terminalRoutes = require('./routes/terminal');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize application
async function initializeApp() {
  try {
    // Initialize database
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      console.error('Failed to initialize database connection');
      process.exit(1);
    }
    
    // Run database migrations
    const migrationRunner = new MigrationRunner();
    await migrationRunner.runMigrations();

    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/generate', generateLimiter);
app.use('/api', basicLimiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DevX Platform API', 
    version: process.env.API_VERSION || '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// Legacy health check (for backward compatibility)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/cost-estimate', costEstimateRoutes);
app.use('/api/costs', costAnalyticsRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/terminal', terminalRoutes);

// Bull Board Dashboard for queue monitoring
// app.use('/admin/queues', serverAdapter.getRouter()); // Commented out - Bull Board not available

// Legacy routes for backward compatibility
app.get('/api/generation/templates', (req, res) => {
  res.redirect(301, '/api/templates');
});

app.post('/api/generation/generate', (req, res) => {
  res.redirect(301, '/api/generate');
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'DevX Platform API Documentation',
    version: process.env.API_VERSION || '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Authenticate user',
        'POST /api/auth/register': 'Register new user',
        'GET /api/auth/validate': 'Validate JWT token',
        'GET /api/auth/me': 'Get current user',
        'POST /api/auth/tokens': 'Create API token',
        'GET /api/auth/tokens': 'List API tokens',
        'DELETE /api/auth/tokens/:tokenId': 'Revoke API token'
      },
      templates: {
        'GET /api/templates': 'List all templates',
        'GET /api/templates/featured': 'Get featured templates',
        'GET /api/templates/popular': 'Get popular templates',
        'GET /api/templates/categories': 'Get template categories',
        'GET /api/templates/technologies': 'Get template technologies',
        'GET /api/templates/:slug': 'Get template by slug',
        'POST /api/templates/:slug/download': 'Record template download',
        'POST /api/templates/:slug/star': 'Star a template'
      },
      projects: {
        'GET /api/projects': 'List user projects',
        'POST /api/projects': 'Create new project',
        'GET /api/projects/:slug': 'Get project by slug',
        'PUT /api/projects/:slug': 'Update project',
        'DELETE /api/projects/:slug': 'Delete project',
        'GET /api/projects/stats/overview': 'Get project statistics',
        'GET /api/projects/activity/recent': 'Get recent activity',
        'POST /api/projects/:slug/deploy': 'Deploy project',
        'GET /api/projects/:slug/logs': 'Get project logs'
      },
      services: {
        'GET /api/services': 'List services',
        'GET /api/services/:slug': 'Get service details',
        'GET /api/services/:slug/status': 'Get service status',
        'POST /api/services/:slug/build': 'Build service',
        'POST /api/services/:slug/test': 'Run service tests',
        'POST /api/services/:slug/scale': 'Scale service',
        'POST /api/services/:slug/stop': 'Stop service',
        'POST /api/services/:slug/start': 'Start service'
      },
      generate: {
        'POST /api/generate': 'Generate service from template',
        'POST /api/generate/preview': 'Preview service generation',
        'GET /api/generate/status/:generation_id': 'Get generation status',
        'GET /api/generate/download/:generation_id': 'Download generated service'
      },
      'cost-estimate': {
        'POST /api/cost-estimate': 'Calculate cost estimate',
        'GET /api/cost-estimate/tiers': 'Get pricing tiers',
        'GET /api/cost-estimate/resources/:template_slug': 'Get template resources',
        'POST /api/cost-estimate/breakdown': 'Calculate multi-service breakdown'
      },
      status: {
        'GET /api/status': 'Get platform status',
        'GET /api/status/components': 'Get component status',
        'GET /api/status/health': 'Health check',
        'GET /api/status/metrics': 'Get system metrics'
      }
    }
  });
});

// Handle 404 for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeApp();
  
  app.listen(PORT, () => {
    console.log(`DevX Platform API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});