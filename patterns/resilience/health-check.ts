import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message?: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
  critical?: boolean;
  timeout?: number;
  interval?: number;
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: Date;
  version?: string;
  uptime: number;
  checks: HealthCheckResult[];
  metadata?: Record<string, any>;
}

/**
 * Health check manager for monitoring application health
 */
export class HealthCheckManager extends EventEmitter {
  private checks: Map<string, HealthCheck> = new Map();
  private checkResults: Map<string, HealthCheckResult> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private startTime: Date;
  private version?: string;

  constructor(version?: string) {
    super();
    this.startTime = new Date();
    this.version = version;
  }

  /**
   * Register a health check
   */
  register(check: HealthCheck): void {
    this.checks.set(check.name, check);
    
    // Start periodic check if interval is specified
    if (check.interval) {
      this.startPeriodicCheck(check);
    }
    
    // Run initial check
    this.runCheck(check).catch(err => {
      console.error(`Initial health check failed for ${check.name}:`, err);
    });
  }

  /**
   * Unregister a health check
   */
  unregister(name: string): void {
    this.checks.delete(name);
    this.checkResults.delete(name);
    
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
  }

  private startPeriodicCheck(check: HealthCheck): void {
    const interval = setInterval(async () => {
      try {
        await this.runCheck(check);
      } catch (error) {
        console.error(`Periodic health check failed for ${check.name}:`, error);
      }
    }, check.interval!);
    
    this.intervals.set(check.name, interval);
  }

  private async runCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        check.check(),
        new Promise<HealthCheckResult>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), check.timeout || 5000);
        })
      ]);
      
      const finalResult = {
        ...result,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
      
      this.checkResults.set(check.name, finalResult);
      this.emit('check:complete', finalResult);
      
      return finalResult;
    } catch (error) {
      const errorResult: HealthCheckResult = {
        name: check.name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
      
      this.checkResults.set(check.name, errorResult);
      this.emit('check:error', errorResult);
      
      return errorResult;
    }
  }

  /**
   * Get current health report
   */
  async getHealth(): Promise<HealthReport> {
    // Run all checks
    const checkPromises = Array.from(this.checks.values()).map(check => this.runCheck(check));
    const results = await Promise.allSettled(checkPromises);
    
    const checks = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const check = Array.from(this.checks.values())[index];
        return {
          name: check.name,
          status: 'unhealthy' as HealthStatus,
          message: 'Check failed',
          duration: 0,
          timestamp: new Date()
        };
      }
    });
    
    // Determine overall status
    const criticalChecks = checks.filter(result => {
      const check = this.checks.get(result.name);
      return check?.critical;
    });
    
    let overallStatus: HealthStatus = 'healthy';
    
    if (criticalChecks.some(c => c.status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (checks.some(c => c.status === 'unhealthy')) {
      overallStatus = 'degraded';
    } else if (checks.some(c => c.status === 'degraded')) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date(),
      version: this.version,
      uptime: Date.now() - this.startTime.getTime(),
      checks
    };
  }

  /**
   * Get cached health report (doesn't run checks)
   */
  getCachedHealth(): HealthReport {
    const checks = Array.from(this.checkResults.values());
    
    const criticalChecks = checks.filter(result => {
      const check = this.checks.get(result.name);
      return check?.critical;
    });
    
    let overallStatus: HealthStatus = 'healthy';
    
    if (criticalChecks.some(c => c.status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (checks.some(c => c.status === 'unhealthy')) {
      overallStatus = 'degraded';
    } else if (checks.some(c => c.status === 'degraded')) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date(),
      version: this.version,
      uptime: Date.now() - this.startTime.getTime(),
      checks
    };
  }

  /**
   * Shutdown all periodic checks
   */
  shutdown(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.removeAllListeners();
  }
}

/**
 * Common health check implementations
 */
export class CommonHealthChecks {
  /**
   * Database connectivity check
   */
  static database(name: string, checkFn: () => Promise<void>): HealthCheck {
    return {
      name,
      check: async () => {
        const startTime = Date.now();
        try {
          await checkFn();
          return {
            name,
            status: 'healthy',
            duration: Date.now() - startTime,
            timestamp: new Date()
          };
        } catch (error) {
          return {
            name,
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Database check failed',
            duration: Date.now() - startTime,
            timestamp: new Date()
          };
        }
      },
      critical: true,
      timeout: 5000,
      interval: 30000
    };
  }

  /**
   * HTTP dependency check
   */
  static httpDependency(name: string, url: string, options?: {
    timeout?: number;
    expectedStatus?: number;
    critical?: boolean;
  }): HealthCheck {
    return {
      name,
      check: async () => {
        const startTime = Date.now();
        try {
          const protocol = url.startsWith('https') ? https : http;
          
          const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
            const req = protocol.get(url, { timeout: options?.timeout || 5000 }, resolve);
            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
          });
          
          const expectedStatus = options?.expectedStatus || 200;
          const isHealthy = response.statusCode === expectedStatus;
          
          return {
            name,
            status: isHealthy ? 'healthy' : 'unhealthy',
            message: isHealthy ? undefined : `Expected status ${expectedStatus}, got ${response.statusCode}`,
            duration: Date.now() - startTime,
            timestamp: new Date(),
            metadata: { statusCode: response.statusCode }
          };
        } catch (error) {
          return {
            name,
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'HTTP check failed',
            duration: Date.now() - startTime,
            timestamp: new Date()
          };
        }
      },
      critical: options?.critical,
      timeout: options?.timeout || 5000,
      interval: 60000
    };
  }

  /**
   * Memory usage check
   */
  static memory(thresholdPercent = 80): HealthCheck {
    return {
      name: 'memory',
      check: async () => {
        const usage = process.memoryUsage();
        const totalMemory = process.platform === 'linux' ? 
          require('os').totalmem() : 
          2 * 1024 * 1024 * 1024; // Default 2GB
        
        const usedPercent = (usage.heapUsed / totalMemory) * 100;
        const status: HealthStatus = 
          usedPercent > thresholdPercent ? 'degraded' : 'healthy';
        
        return {
          name: 'memory',
          status,
          message: status === 'degraded' ? 
            `Memory usage ${usedPercent.toFixed(1)}% exceeds threshold ${thresholdPercent}%` : 
            undefined,
          duration: 0,
          timestamp: new Date(),
          metadata: {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            rss: usage.rss,
            usedPercent: usedPercent.toFixed(1)
          }
        };
      },
      interval: 30000
    };
  }

  /**
   * Disk space check
   */
  static diskSpace(path: string, thresholdPercent = 90): HealthCheck {
    return {
      name: 'disk-space',
      check: async () => {
        // This is a simplified version - in production you'd use a library like disk-usage
        const mockUsedPercent = Math.random() * 100; // Mock implementation
        const status: HealthStatus = 
          mockUsedPercent > thresholdPercent ? 'unhealthy' : 'healthy';
        
        return {
          name: 'disk-space',
          status,
          message: status === 'unhealthy' ? 
            `Disk usage ${mockUsedPercent.toFixed(1)}% exceeds threshold ${thresholdPercent}%` : 
            undefined,
          duration: 0,
          timestamp: new Date(),
          metadata: {
            path,
            usedPercent: mockUsedPercent.toFixed(1)
          }
        };
      },
      critical: true,
      interval: 60000
    };
  }
}

/**
 * Express middleware for health endpoints
 */
export function createHealthCheckMiddleware(manager: HealthCheckManager) {
  return {
    liveness: async (_req: any, res: any) => {
      res.json({ status: 'ok', timestamp: new Date() });
    },
    
    readiness: async (_req: any, res: any) => {
      const health = await manager.getHealth();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    },
    
    health: async (_req: any, res: any) => {
      const health = await manager.getHealth();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    }
  };
}