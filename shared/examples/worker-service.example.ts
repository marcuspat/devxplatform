import { Worker } from 'bullmq';
import Redis from 'ioredis';
import {
  createLogger,
  createTracingService,
  createMetricsService,
  getCorrelationContext,
  wrapWithCorrelationContext,
  Logger
} from '../index';

// Initialize services
const logger = createLogger('worker-service');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
});

// Initialize tracing
const tracingService = createTracingService({
  serviceName: 'worker-service',
  enableAutoInstrumentation: true
});

// Initialize metrics
const metricsService = createMetricsService({
  serviceName: 'worker-service',
  customMetrics: [
    {
      name: 'jobs_processed_total',
      type: 'counter',
      help: 'Total number of jobs processed',
      labelNames: ['queue', 'job_type', 'status']
    },
    {
      name: 'job_processing_duration',
      type: 'histogram',
      help: 'Job processing duration in seconds',
      labelNames: ['queue', 'job_type'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60]
    },
    {
      name: 'jobs_in_queue',
      type: 'gauge',
      help: 'Number of jobs currently in queue',
      labelNames: ['queue', 'status']
    },
    {
      name: 'job_retries_total',
      type: 'counter',
      help: 'Total number of job retries',
      labelNames: ['queue', 'job_type']
    }
  ]
});

// Job processors
interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  correlationId?: string;
}

interface ImageProcessingJobData {
  imageUrl: string;
  operations: string[];
  outputPath: string;
  correlationId?: string;
}

interface DataSyncJobData {
  source: string;
  destination: string;
  lastSyncTime?: Date;
  correlationId?: string;
}

// Email processor
async function processEmailJob(job: any, logger: Logger) {
  const data: EmailJobData = job.data;
  const tracer = tracingService.getTracer();
  
  return tracer.startActiveSpan(`process-email-${job.id}`, async (span) => {
    try {
      span.setAttributes({
        'job.id': job.id,
        'job.type': 'email',
        'email.to': data.to,
        'email.subject': data.subject
      });

      logger.info('Processing email job', {
        jobId: job.id,
        to: data.to,
        subject: data.subject,
        correlationId: data.correlationId
      });

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate occasional failures
      if (Math.random() < 0.1) {
        throw new Error('Email service temporarily unavailable');
      }

      logger.info('Email sent successfully', {
        jobId: job.id,
        to: data.to
      });

      span.setStatus({ code: 1 });
      return { success: true, sentAt: new Date().toISOString() };
    } catch (error) {
      span.setStatus({ code: 2, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Image processing processor
async function processImageJob(job: any, logger: Logger) {
  const data: ImageProcessingJobData = job.data;
  const tracer = tracingService.getTracer();
  
  return tracer.startActiveSpan(`process-image-${job.id}`, async (span) => {
    try {
      span.setAttributes({
        'job.id': job.id,
        'job.type': 'image-processing',
        'image.url': data.imageUrl,
        'image.operations': data.operations.join(',')
      });

      logger.info('Processing image job', {
        jobId: job.id,
        imageUrl: data.imageUrl,
        operations: data.operations,
        correlationId: data.correlationId
      });

      // Simulate image processing steps
      for (const operation of data.operations) {
        await tracer.startActiveSpan(`image-operation-${operation}`, async (opSpan) => {
          try {
            logger.debug(`Applying ${operation} to image`, { jobId: job.id });
            await new Promise(resolve => setTimeout(resolve, 500));
            opSpan.setStatus({ code: 1 });
          } finally {
            opSpan.end();
          }
        });

        // Update job progress
        await job.updateProgress({
          current: data.operations.indexOf(operation) + 1,
          total: data.operations.length
        });
      }

      logger.info('Image processed successfully', {
        jobId: job.id,
        outputPath: data.outputPath
      });

      span.setStatus({ code: 1 });
      return {
        success: true,
        outputPath: data.outputPath,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      span.setStatus({ code: 2, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Data sync processor
async function processDataSyncJob(job: any, logger: Logger) {
  const data: DataSyncJobData = job.data;
  const tracer = tracingService.getTracer();
  
  return tracer.startActiveSpan(`process-datasync-${job.id}`, async (span) => {
    try {
      span.setAttributes({
        'job.id': job.id,
        'job.type': 'data-sync',
        'sync.source': data.source,
        'sync.destination': data.destination
      });

      logger.info('Processing data sync job', {
        jobId: job.id,
        source: data.source,
        destination: data.destination,
        correlationId: data.correlationId
      });

      // Simulate data sync
      const recordsToSync = Math.floor(Math.random() * 1000) + 100;
      let recordsSynced = 0;

      while (recordsSynced < recordsToSync) {
        await new Promise(resolve => setTimeout(resolve, 100));
        recordsSynced += Math.min(50, recordsToSync - recordsSynced);
        
        await job.updateProgress({
          current: recordsSynced,
          total: recordsToSync
        });
      }

      logger.info('Data sync completed', {
        jobId: job.id,
        recordsSynced
      });

      span.setStatus({ code: 1 });
      return {
        success: true,
        recordsSynced,
        syncedAt: new Date().toISOString()
      };
    } catch (error) {
      span.setStatus({ code: 2, message: (error as Error).message });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Create workers
const emailWorker = new Worker(
  'email-queue',
  wrapWithCorrelationContext(async (job) => {
    const startTime = Date.now();
    try {
      const result = await processEmailJob(job, logger);
      
      metricsService.incrementCounter('jobs_processed_total', {
        queue: 'email-queue',
        job_type: 'email',
        status: 'success'
      });
      
      metricsService.observeHistogram('job_processing_duration', 
        (Date.now() - startTime) / 1000,
        { queue: 'email-queue', job_type: 'email' }
      );
      
      return result;
    } catch (error) {
      metricsService.incrementCounter('jobs_processed_total', {
        queue: 'email-queue',
        job_type: 'email',
        status: 'failed'
      });
      
      if (job.attemptsMade > 0) {
        metricsService.incrementCounter('job_retries_total', {
          queue: 'email-queue',
          job_type: 'email'
        });
      }
      
      logger.error('Email job failed', error as Error, {
        jobId: job.id,
        attempt: job.attemptsMade + 1
      });
      
      throw error;
    }
  }),
  {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000
    }
  }
);

const imageWorker = new Worker(
  'image-queue',
  wrapWithCorrelationContext(async (job) => {
    const startTime = Date.now();
    try {
      const result = await processImageJob(job, logger);
      
      metricsService.incrementCounter('jobs_processed_total', {
        queue: 'image-queue',
        job_type: 'image-processing',
        status: 'success'
      });
      
      metricsService.observeHistogram('job_processing_duration', 
        (Date.now() - startTime) / 1000,
        { queue: 'image-queue', job_type: 'image-processing' }
      );
      
      return result;
    } catch (error) {
      metricsService.incrementCounter('jobs_processed_total', {
        queue: 'image-queue',
        job_type: 'image-processing',
        status: 'failed'
      });
      
      logger.error('Image processing job failed', error as Error, {
        jobId: job.id
      });
      
      throw error;
    }
  }),
  {
    connection: redis,
    concurrency: 3
  }
);

const dataSyncWorker = new Worker(
  'datasync-queue',
  wrapWithCorrelationContext(async (job) => {
    const startTime = Date.now();
    try {
      const result = await processDataSyncJob(job, logger);
      
      metricsService.incrementCounter('jobs_processed_total', {
        queue: 'datasync-queue',
        job_type: 'data-sync',
        status: 'success'
      });
      
      metricsService.observeHistogram('job_processing_duration', 
        (Date.now() - startTime) / 1000,
        { queue: 'datasync-queue', job_type: 'data-sync' }
      );
      
      return result;
    } catch (error) {
      metricsService.incrementCounter('jobs_processed_total', {
        queue: 'datasync-queue',
        job_type: 'data-sync',
        status: 'failed'
      });
      
      logger.error('Data sync job failed', error as Error, {
        jobId: job.id
      });
      
      throw error;
    }
  }),
  {
    connection: redis,
    concurrency: 1 // Data sync should run one at a time
  }
);

// Worker event handlers
[emailWorker, imageWorker, dataSyncWorker].forEach((worker, index) => {
  const queueName = ['email-queue', 'image-queue', 'datasync-queue'][index];
  
  worker.on('completed', (job) => {
    logger.info('Job completed', {
      queue: queueName,
      jobId: job.id,
      jobType: job.name
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', err, {
      queue: queueName,
      jobId: job?.id,
      jobType: job?.name
    });
  });

  worker.on('stalled', (jobId) => {
    logger.warn('Job stalled', {
      queue: queueName,
      jobId
    });
  });
});

// Health check server
import express from 'express';
const app = express();

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    workers: {
      email: emailWorker.isRunning(),
      image: imageWorker.isRunning(),
      dataSync: dataSyncWorker.isRunning()
    }
  };
  
  res.json(health);
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsService.getContentType());
  res.end(await metricsService.getMetrics());
});

// Start services
async function start() {
  try {
    await tracingService.start();
    
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      logger.info(`Worker service health check listening on port ${port}`);
    });
    
    logger.info('Worker service started', {
      workers: ['email', 'image', 'datasync']
    });
  } catch (error) {
    logger.error('Failed to start worker service', error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down worker service');
  
  await emailWorker.close();
  await imageWorker.close();
  await dataSyncWorker.close();
  
  await tracingService.shutdown();
  redis.disconnect();
  
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();