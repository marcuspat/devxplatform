import 'dotenv/config';
import { Worker } from 'bullmq';
import { config } from './config';
import { logger } from './utils/logger';
import { redisConnection } from './config/redis';
import { gracefulShutdown } from './utils/graceful-shutdown';

// Job processors
import { emailProcessor } from './processors/email.processor';
import { fileProcessor } from './processors/file.processor';
import { reportProcessor } from './processors/report.processor';
import { cleanupProcessor } from './processors/cleanup.processor';
import { webhookProcessor } from './processors/webhook.processor';

// Metrics
import { updateWorkerMetrics } from './metrics';

export async function startWorker(): Promise<Worker[]> {
  const workers: Worker[] = [];

  try {
    // Email processing worker
    const emailWorker = new Worker('email', emailProcessor, {
      connection: redisConnection,
      concurrency: config.workers.email.concurrency,
      removeOnComplete: config.workers.email.removeOnComplete,
      removeOnFail: config.workers.email.removeOnFail,
      maxStalledCount: config.workers.email.maxStalledCount,
      stalledInterval: config.workers.email.stalledInterval,
    });

    // File processing worker
    const fileWorker = new Worker('file', fileProcessor, {
      connection: redisConnection,
      concurrency: config.workers.file.concurrency,
      removeOnComplete: config.workers.file.removeOnComplete,
      removeOnFail: config.workers.file.removeOnFail,
      maxStalledCount: config.workers.file.maxStalledCount,
      stalledInterval: config.workers.file.stalledInterval,
    });

    // Report generation worker
    const reportWorker = new Worker('report', reportProcessor, {
      connection: redisConnection,
      concurrency: config.workers.report.concurrency,
      removeOnComplete: config.workers.report.removeOnComplete,
      removeOnFail: config.workers.report.removeOnFail,
      maxStalledCount: config.workers.report.maxStalledCount,
      stalledInterval: config.workers.report.stalledInterval,
    });

    // Cleanup worker
    const cleanupWorker = new Worker('cleanup', cleanupProcessor, {
      connection: redisConnection,
      concurrency: config.workers.cleanup.concurrency,
      removeOnComplete: config.workers.cleanup.removeOnComplete,
      removeOnFail: config.workers.cleanup.removeOnFail,
      maxStalledCount: config.workers.cleanup.maxStalledCount,
      stalledInterval: config.workers.cleanup.stalledInterval,
    });

    // Webhook worker
    const webhookWorker = new Worker('webhook', webhookProcessor, {
      connection: redisConnection,
      concurrency: config.workers.webhook.concurrency,
      removeOnComplete: config.workers.webhook.removeOnComplete,
      removeOnFail: config.workers.webhook.removeOnFail,
      maxStalledCount: config.workers.webhook.maxStalledCount,
      stalledInterval: config.workers.webhook.stalledInterval,
    });

    workers.push(emailWorker, fileWorker, reportWorker, cleanupWorker, webhookWorker);

    // Setup event listeners for all workers
    workers.forEach((worker, index) => {
      const workerNames = ['email', 'file', 'report', 'cleanup', 'webhook'];
      const workerName = workerNames[index];

      worker.on('ready', () => {
        logger.info(`${workerName} worker is ready`);
      });

      worker.on('active', (job) => {
        logger.info(`${workerName} worker processing job ${job.id}`);
        updateWorkerMetrics(workerName, 'active', 1);
      });

      worker.on('completed', (job) => {
        logger.info(`${workerName} worker completed job ${job.id} in ${job.processedOn! - job.timestamp}ms`);
        updateWorkerMetrics(workerName, 'completed', 1);
      });

      worker.on('failed', (job, err) => {
        logger.error(`${workerName} worker failed job ${job?.id}:`, err);
        updateWorkerMetrics(workerName, 'failed', 1);
      });

      worker.on('stalled', (jobId) => {
        logger.warn(`${workerName} worker job ${jobId} stalled`);
        updateWorkerMetrics(workerName, 'stalled', 1);
      });

      worker.on('error', (err) => {
        logger.error(`${workerName} worker error:`, err);
      });
    });

    logger.info(`Started ${workers.length} worker processes`);
    return workers;

  } catch (error) {
    logger.error('Failed to start workers:', error);
    throw error;
  }
}

// If this file is run directly, start workers
if (require.main === module) {
  startWorker()
    .then((workers) => {
      gracefulShutdown(null, workers);
    })
    .catch((error) => {
      logger.error('Failed to start worker:', error);
      process.exit(1);
    });
}