import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import * as http from 'http';
import { config } from './config';
import { logger } from './utils/logger';

// Enable default metrics collection
collectDefaultMetrics();

// Job metrics
export const jobsTotal = new Counter({
  name: 'jobs_total',
  help: 'Total number of jobs processed',
  labelNames: ['queue', 'status'],
});

export const jobDuration = new Histogram({
  name: 'job_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600, 1800],
});

export const queueSize = new Gauge({
  name: 'queue_size',
  help: 'Number of jobs in queue by state',
  labelNames: ['queue', 'state'],
});

export const workerConnections = new Gauge({
  name: 'worker_connections',
  help: 'Number of active worker connections',
  labelNames: ['queue'],
});

// Email metrics
export const emailsTotal = new Counter({
  name: 'emails_total',
  help: 'Total number of emails processed',
  labelNames: ['status'],
});

// File processing metrics
export const filesProcessedTotal = new Counter({
  name: 'files_processed_total',
  help: 'Total number of files processed',
  labelNames: ['type', 'status'],
});

export const fileProcessingDuration = new Histogram({
  name: 'file_processing_duration_seconds',
  help: 'Duration of file processing in seconds',
  labelNames: ['type'],
  buckets: [1, 5, 10, 30, 60, 300, 600],
});

// Webhook metrics
export const webhooksTotal = new Counter({
  name: 'webhooks_total',
  help: 'Total number of webhooks sent',
  labelNames: ['status_code'],
});

export const webhookDuration = new Histogram({
  name: 'webhook_duration_seconds',
  help: 'Duration of webhook requests in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

// System metrics
export const redisConnections = new Gauge({
  name: 'redis_connections',
  help: 'Number of Redis connections',
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
export function updateJobMetrics(queue: string, status: string, duration?: number): void {
  jobsTotal.inc({ queue, status });
  if (duration !== undefined) {
    jobDuration.observe({ queue }, duration);
  }
}

export function updateQueueSize(queue: string, state: string, size: number): void {
  queueSize.set({ queue, state }, size);
}

export function updateWorkerMetrics(queue: string, event: string, count: number): void {
  switch (event) {
    case 'active':
      workerConnections.set({ queue }, count);
      break;
    case 'completed':
    case 'failed':
    case 'stalled':
      jobsTotal.inc({ queue, status: event });
      break;
  }
}

export function updateEmailMetrics(status: string): void {
  emailsTotal.inc({ status });
}

export function updateFileMetrics(type: string, status: string, duration?: number): void {
  filesProcessedTotal.inc({ type, status });
  if (duration !== undefined) {
    fileProcessingDuration.observe({ type }, duration);
  }
}

export function updateWebhookMetrics(statusCode: number, duration: number): void {
  webhooksTotal.inc({ status_code: statusCode.toString() });
  webhookDuration.observe(duration);
}

export function updateRedisMetrics(connections: number): void {
  redisConnections.set(connections);
}