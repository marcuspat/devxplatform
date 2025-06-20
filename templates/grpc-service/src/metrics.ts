import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import * as http from 'http';
import { config } from './config';
import { logger } from './utils/logger';

// Enable default metrics collection
collectDefaultMetrics();

// Custom gRPC metrics
export const grpcRequestsTotal = new Counter({
  name: 'grpc_requests_total',
  help: 'Total number of gRPC requests',
  labelNames: ['method', 'status'],
});

export const grpcRequestDuration = new Histogram({
  name: 'grpc_request_duration_seconds',
  help: 'Duration of gRPC requests in seconds',
  labelNames: ['method'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});

export const grpcActiveConnections = new Gauge({
  name: 'grpc_active_connections',
  help: 'Number of active gRPC connections',
});

// Business metrics
export const usersTotal = new Gauge({
  name: 'users_total',
  help: 'Total number of users in the system',
});

export const userOperationsTotal = new Counter({
  name: 'user_operations_total',
  help: 'Total number of user operations',
  labelNames: ['operation', 'status'],
});

// Health check metrics
export const healthCheckStatus = new Gauge({
  name: 'health_check_status',
  help: 'Health check status (1 = healthy, 0 = unhealthy)',
  labelNames: ['service', 'check'],
});

export function startMetricsServer(): void {
  if (!config.metrics.enabled) {
    logger.info('Metrics collection disabled');
    return;
  }

  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } else if (req.url === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'healthy' }));
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  server.listen(config.metrics.port, () => {
    logger.info(`Metrics server listening on port ${config.metrics.port}`);
    logger.info(`Metrics available at http://localhost:${config.metrics.port}/metrics`);
  });

  // Graceful shutdown for metrics server
  process.on('SIGTERM', () => {
    server.close(() => {
      logger.info('Metrics server closed');
    });
  });
}

// Helper functions to update metrics
export function recordGrpcRequest(method: string, status: string, duration: number): void {
  grpcRequestsTotal.inc({ method, status });
  grpcRequestDuration.observe({ method }, duration);
}

export function updateActiveConnections(count: number): void {
  grpcActiveConnections.set(count);
}

export function updateUsersTotal(count: number): void {
  usersTotal.set(count);
}

export function recordUserOperation(operation: string, status: string): void {
  userOperationsTotal.inc({ operation, status });
}

export function updateHealthCheckStatus(service: string, check: string, healthy: boolean): void {
  healthCheckStatus.set({ service, check }, healthy ? 1 : 0);
}