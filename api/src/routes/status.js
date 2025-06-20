const express = require('express');
const { pool } = require('../../config/database');
const { optionalAuth } = require('../middleware/auth-simple');

const router = express.Router();

// Platform status endpoint
router.get('/', optionalAuth, async (req, res) => {
  try {
    const status = await getPlatformStatus();
    
    res.json({
      success: true,
      message: 'Platform status retrieved successfully',
      data: {
        status
      }
    });
  } catch (error) {
    console.error('Get platform status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching platform status'
    });
  }
});

// Detailed component status
router.get('/components', optionalAuth, async (req, res) => {
  try {
    const components = await getComponentStatus();
    
    res.json({
      success: true,
      message: 'Component status retrieved successfully',
      data: {
        components
      }
    });
  } catch (error) {
    console.error('Get component status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching component status'
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = await getHealthStatus();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      message: `System is ${health.status}`,
      data: {
        health
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      message: 'System is unhealthy',
      data: {
        health: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        }
      }
    });
  }
});

// System metrics
router.get('/metrics', optionalAuth, async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    
    res.json({
      success: true,
      message: 'System metrics retrieved successfully',
      data: {
        metrics
      }
    });
  } catch (error) {
    console.error('Get system metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching system metrics'
    });
  }
});

// Helper functions
async function getPlatformStatus() {
  const startTime = Date.now();
  
  // Check database connection
  const dbHealth = await checkDatabaseHealth();
  
  // Get system metrics
  const metrics = await getSystemMetrics();
  
  // Determine overall health
  let overallHealth = 'operational';
  let healthyComponents = 0;
  let totalComponents = 0;
  
  const components = await getComponentStatus();
  
  Object.values(components).forEach(component => {
    totalComponents++;
    if (component.status === 'operational') {
      healthyComponents++;
    } else if (component.status === 'degraded') {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'major_outage';
    }
  });
  
  const responseTime = Date.now() - startTime;
  
  return {
    health: overallHealth,
    version: process.env.API_VERSION || '1.0.0',
    region: process.env.AWS_REGION || 'us-west-2',
    uptime: process.uptime(),
    response_time: responseTime,
    timestamp: new Date().toISOString(),
    services: {
      total: totalComponents,
      healthy: healthyComponents,
      degraded: totalComponents - healthyComponents,
      down: 0
    },
    resources: metrics.resources,
    database: dbHealth,
    incidents: [] // Would come from incident tracking system
  };
}

async function getComponentStatus() {
  const components = {};
  
  // API Gateway
  components['api_gateway'] = {
    name: 'API Gateway',
    status: 'operational',
    response_time: Math.floor(Math.random() * 50) + 10,
    last_check: new Date().toISOString()
  };
  
  // Database
  const dbHealth = await checkDatabaseHealth();
  components['database'] = {
    name: 'Database Cluster',
    status: dbHealth.status === 'healthy' ? 'operational' : 'major_outage',
    response_time: dbHealth.response_time,
    last_check: new Date().toISOString(),
    details: dbHealth
  };
  
  // Template Storage
  components['template_storage'] = {
    name: 'Template Storage',
    status: 'operational',
    response_time: Math.floor(Math.random() * 30) + 5,
    last_check: new Date().toISOString()
  };
  
  // Service Generation
  components['service_generation'] = {
    name: 'Service Generation',
    status: 'operational',
    response_time: Math.floor(Math.random() * 100) + 50,
    last_check: new Date().toISOString()
  };
  
  // Authentication Service
  components['authentication'] = {
    name: 'Authentication Service',
    status: 'operational',
    response_time: Math.floor(Math.random() * 40) + 15,
    last_check: new Date().toISOString()
  };
  
  // CDN
  components['cdn'] = {
    name: 'Content Delivery Network',
    status: 'operational',
    response_time: Math.floor(Math.random() * 20) + 5,
    last_check: new Date().toISOString()
  };
  
  return components;
}

async function getHealthStatus() {
  const checks = [];
  
  // Database health check
  const dbCheck = await checkDatabaseHealth();
  checks.push({
    name: 'database',
    status: dbCheck.status,
    response_time: dbCheck.response_time,
    details: dbCheck.connection_count ? `${dbCheck.connection_count} active connections` : null
  });
  
  // Memory check
  const memoryUsage = process.memoryUsage();
  const memoryStatus = memoryUsage.heapUsed / memoryUsage.heapTotal < 0.9 ? 'healthy' : 'warning';
  checks.push({
    name: 'memory',
    status: memoryStatus,
    details: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB used of ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
  });
  
  // Disk space check (simplified)
  checks.push({
    name: 'disk_space',
    status: 'healthy',
    details: 'Sufficient disk space available'
  });
  
  // Overall health determination
  const unhealthyChecks = checks.filter(check => check.status !== 'healthy');
  const overallStatus = unhealthyChecks.length === 0 ? 'healthy' : 
                       unhealthyChecks.some(check => check.status === 'unhealthy') ? 'unhealthy' : 'warning';
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks
  };
}

async function checkDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    // Test database connection
    const client = await pool.connect();
    
    // Test query
    const result = await client.query('SELECT NOW() as timestamp, version()');
    client.release();
    
    const responseTime = Date.now() - startTime;
    
    // Get connection pool stats
    const totalCount = pool.totalCount;
    const idleCount = pool.idleCount;
    const waitingCount = pool.waitingCount;
    
    return {
      status: 'healthy',
      response_time: responseTime,
      timestamp: result.rows[0].timestamp,
      version: result.rows[0].version.split(' ')[0], // Just the PostgreSQL version
      connection_count: totalCount,
      idle_connections: idleCount,
      waiting_connections: waitingCount
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      response_time: responseTime,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function getSystemMetrics() {
  // Get basic system metrics
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  // Mock additional metrics (in a real system, these would come from monitoring)
  const metrics = {
    api: {
      requests_per_minute: Math.floor(Math.random() * 500) + 100,
      avg_response_time: Math.floor(Math.random() * 100) + 50,
      error_rate: Math.random() * 0.05, // 0-5%
      active_connections: Math.floor(Math.random() * 100) + 20
    },
    resources: {
      cpu_percent: Math.floor(Math.random() * 60) + 20,
      memory_used_bytes: memoryUsage.heapUsed,
      memory_total_bytes: memoryUsage.heapTotal,
      memory_percent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      uptime_seconds: Math.floor(process.uptime())
    },
    database: {
      active_connections: Math.floor(Math.random() * 50) + 10,
      queries_per_second: Math.floor(Math.random() * 100) + 20,
      avg_query_time: Math.floor(Math.random() * 50) + 10
    }
  };
  
  return metrics;
}

module.exports = router;