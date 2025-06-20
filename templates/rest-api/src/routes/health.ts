import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import os from 'os';
import { config } from '../config';

export const healthRouter = Router();

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  service: string;
  version: string;
  environment: string;
  checks?: Record<string, HealthCheckResult>;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message?: string;
  latency?: number;
}

// Liveness probe - basic health check
healthRouter.get('/live', (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe - detailed health check
healthRouter.get('/ready', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const checks: Record<string, HealthCheckResult> = {};
  
  // Check database connection (example)
  if (config.database.url) {
    try {
      // TODO: Implement actual database ping
      checks.database = {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Check Redis connection (example)
  if (config.redis.url) {
    try {
      // TODO: Implement actual Redis ping
      checks.redis = {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const memoryPercentage = (memoryUsage.rss / totalMemory) * 100;
  
  checks.memory = {
    status: memoryPercentage < 90 ? 'healthy' : 'unhealthy',
    message: `${memoryPercentage.toFixed(2)}% memory used`,
  };
  
  // Overall health status
  const isHealthy = Object.values(checks).every(check => check.status === 'healthy');
  
  const health: HealthCheck = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'rest-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    checks,
  };
  
  res.status(isHealthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE).json(health);
});

// Detailed health information
healthRouter.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'rest-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: process.memoryUsage(),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model,
        loadAverage: os.loadavg(),
      },
    },
  };
  
  res.status(StatusCodes.OK).json(health);
});