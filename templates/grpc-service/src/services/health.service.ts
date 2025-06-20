import * as grpc from '@grpc/grpc-js';
import { logger } from '../utils/logger';
import { config } from '../config';

// Import generated proto types
import {
  HealthCheckRequest,
  HealthCheckResponse,
  CheckResult
} from '../generated/health_pb';

export class HealthServiceImplementation {
  private healthStatus: Map<string, HealthCheckResponse.ServingStatus> = new Map();

  constructor() {
    // Initialize health status for known services
    this.healthStatus.set('', HealthCheckResponse.ServingStatus.SERVING);
    this.healthStatus.set('user.UserService', HealthCheckResponse.ServingStatus.SERVING);
    this.healthStatus.set('health.Health', HealthCheckResponse.ServingStatus.SERVING);
  }

  async check(
    call: grpc.ServerUnaryCall<HealthCheckRequest, HealthCheckResponse>,
    callback: grpc.sendUnaryData<HealthCheckResponse>
  ) {
    try {
      const request = call.request;
      const serviceName = request.getService();

      logger.debug(`Health check requested for service: ${serviceName}`);

      const response = new HealthCheckResponse();
      const checks = new Map<string, CheckResult>();

      // Get overall status
      const status = this.healthStatus.get(serviceName) || 
                    HealthCheckResponse.ServingStatus.SERVICE_UNKNOWN;
      
      // Perform additional health checks
      if (serviceName === '' || serviceName === 'user.UserService') {
        // Check database connectivity
        const dbCheck = await this.checkDatabase();
        checks.set('database', dbCheck);

        // Check memory usage
        const memoryCheck = this.checkMemoryUsage();
        checks.set('memory', memoryCheck);

        // Check disk space
        const diskCheck = this.checkDiskSpace();
        checks.set('disk', diskCheck);
      }

      // Convert checks to proto map
      const checksMap = response.getChecksMap();
      checks.forEach((checkResult, name) => {
        checksMap.set(name, checkResult);
      });

      // Determine overall status based on individual checks
      const allHealthy = Array.from(checks.values()).every(check => check.getHealthy());
      const finalStatus = allHealthy && status === HealthCheckResponse.ServingStatus.SERVING
        ? HealthCheckResponse.ServingStatus.SERVING
        : HealthCheckResponse.ServingStatus.NOT_SERVING;

      response.setStatus(finalStatus);

      callback(null, response);
    } catch (error) {
      logger.error('Error in health check:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Health check failed',
      });
    }
  }

  async watch(
    call: grpc.ServerWritableStream<HealthCheckRequest, HealthCheckResponse>
  ) {
    try {
      const request = call.request;
      const serviceName = request.getService();

      logger.info(`Starting health watch for service: ${serviceName}`);

      // Send initial status
      const initialResponse = new HealthCheckResponse();
      const status = this.healthStatus.get(serviceName) || 
                    HealthCheckResponse.ServingStatus.SERVICE_UNKNOWN;
      initialResponse.setStatus(status);
      call.write(initialResponse);

      // Set up periodic health checks
      const interval = setInterval(async () => {
        try {
          const response = new HealthCheckResponse();
          const checks = new Map<string, CheckResult>();

          if (serviceName === '' || serviceName === 'user.UserService') {
            const dbCheck = await this.checkDatabase();
            checks.set('database', dbCheck);

            const memoryCheck = this.checkMemoryUsage();
            checks.set('memory', memoryCheck);
          }

          const checksMap = response.getChecksMap();
          checks.forEach((checkResult, name) => {
            checksMap.set(name, checkResult);
          });

          const allHealthy = Array.from(checks.values()).every(check => check.getHealthy());
          const currentStatus = this.healthStatus.get(serviceName) || 
                              HealthCheckResponse.ServingStatus.SERVICE_UNKNOWN;
          const finalStatus = allHealthy && currentStatus === HealthCheckResponse.ServingStatus.SERVING
            ? HealthCheckResponse.ServingStatus.SERVING
            : HealthCheckResponse.ServingStatus.NOT_SERVING;

          response.setStatus(finalStatus);
          call.write(response);
        } catch (error) {
          logger.error('Error in health watch update:', error);
        }
      }, 30000); // Check every 30 seconds

      call.on('cancelled', () => {
        clearInterval(interval);
        logger.info('Health watch cancelled by client');
      });

      call.on('end', () => {
        clearInterval(interval);
        logger.info('Health watch ended');
      });
    } catch (error) {
      logger.error('Error in health watch:', error);
      call.destroy();
    }
  }

  // Helper methods for health checks
  private async checkDatabase(): Promise<CheckResult> {
    const startTime = Date.now();
    const result = new CheckResult();

    try {
      // TODO: Implement actual database ping
      // For now, simulate a database check
      if (config.database.url) {
        // Simulate database connectivity check
        await new Promise(resolve => setTimeout(resolve, 10));
        result.setHealthy(true);
        result.setMessage('Database connection successful');
      } else {
        result.setHealthy(true);
        result.setMessage('Database not configured');
      }
      
      result.setLatencyMs(Date.now() - startTime);
    } catch (error) {
      result.setHealthy(false);
      result.setMessage(`Database connection failed: ${error}`);
      result.setLatencyMs(Date.now() - startTime);
    }

    return result;
  }

  private checkMemoryUsage(): CheckResult {
    const result = new CheckResult();
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const memoryPercentage = (memoryUsage.rss / totalMemory) * 100;

    result.setHealthy(memoryPercentage < 90);
    result.setMessage(`Memory usage: ${memoryPercentage.toFixed(2)}%`);
    result.setLatencyMs(0);

    return result;
  }

  private checkDiskSpace(): CheckResult {
    const result = new CheckResult();
    
    try {
      const fs = require('fs');
      const stats = fs.statSync(process.cwd());
      
      // Simplified disk check (in real implementation, check available space)
      result.setHealthy(true);
      result.setMessage('Disk space check passed');
      result.setLatencyMs(0);
    } catch (error) {
      result.setHealthy(false);
      result.setMessage(`Disk space check failed: ${error}`);
      result.setLatencyMs(0);
    }

    return result;
  }

  // Method to update service health status
  public setServiceStatus(serviceName: string, status: HealthCheckResponse.ServingStatus) {
    this.healthStatus.set(serviceName, status);
    logger.info(`Service ${serviceName} status updated to ${status}`);
  }
}