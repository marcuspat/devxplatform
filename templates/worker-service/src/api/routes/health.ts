import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import os from 'os';
import { config } from '../../config';
import { redisConnection } from '../../config/redis';
import { allQueues } from '../../queues';

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
  
  // Check Redis connection
  try {
    const redisStartTime = Date.now();
    await redisConnection.ping();
    checks.redis = {
      status: 'healthy',
      latency: Date.now() - redisStartTime,
    };
  } catch (error) {
    checks.redis = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
  
  // Check queue health
  try {
    const queueStartTime = Date.now();
    const queueStats = await Promise.all(
      Object.entries(allQueues).map(async ([name, queue]) => {
        const waiting = await queue.getWaiting();
        return { name, waiting: waiting.length };
      })
    );
    
    checks.queues = {
      status: 'healthy',
      latency: Date.now() - queueStartTime,
      message: `${queueStats.length} queues operational`,
    };
  } catch (error) {
    checks.queues = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Queue check failed',
    };
  }
  
  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const memoryPercentage = (memoryUsage.rss / totalMemory) * 100;
  
  checks.memory = {
    status: memoryPercentage < 90 ? 'healthy' : 'unhealthy',
    message: `${memoryPercentage.toFixed(2)}% memory used`,
  };
  
  // Check disk space (upload directory)
  try {
    const fs = require('fs-extra');
    if (await fs.pathExists(config.files.uploadDir)) {
      checks.disk = {
        status: 'healthy',
        message: 'Upload directory accessible',
      };
    } else {
      checks.disk = {
        status: 'unhealthy',
        message: 'Upload directory not accessible',
      };
    }
  } catch (error) {
    checks.disk = {
      status: 'unhealthy',
      message: 'Disk check failed',
    };
  }
  
  // Overall health status
  const isHealthy = Object.values(checks).every(check => check.status === 'healthy');
  
  const health: HealthCheck = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'worker-service',
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
    service: 'worker-service',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    mode: config.mode,
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
    queues: await getQueueStatistics(),
  };
  
  res.status(StatusCodes.OK).json(health);
});

async function getQueueStatistics() {
  const queueStats: Record<string, any> = {};
  
  try {
    for (const [queueName, queue] of Object.entries(allQueues)) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      queueStats[queueName] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    }
  } catch (error) {
    // Ignore errors, return empty stats
  }
  
  return queueStats;
}