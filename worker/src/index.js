const express = require('express');
const { Worker } = require('bullmq');
const Redis = require('ioredis');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Environment variables
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = process.env.QUEUE_NAME || 'devx-jobs';
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY) || 5;
const PORT = process.env.PORT || 3003;

// Redis connection
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false
});

// Express app for health checks
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    worker: 'running',
    redis: redis.status
  });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const info = await redis.info('memory');
    res.json({
      redis_memory: info,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Job processors
const processors = {
  // Email job processor
  'send-email': async (job) => {
    logger.info(`Processing email job: ${job.id}`, { data: job.data });
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info(`Email sent successfully for job: ${job.id}`);
    return { success: true, jobId: job.id };
  },

  // File processing job
  'process-file': async (job) => {
    logger.info(`Processing file job: ${job.id}`, { data: job.data });
    
    // Simulate file processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    logger.info(`File processed successfully for job: ${job.id}`);
    return { success: true, jobId: job.id, processed: true };
  },

  // Report generation job
  'generate-report': async (job) => {
    logger.info(`Generating report job: ${job.id}`, { data: job.data });
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    logger.info(`Report generated successfully for job: ${job.id}`);
    return { success: true, jobId: job.id, reportId: `report-${Date.now()}` };
  },

  // Template deployment job
  'deploy-template': async (job) => {
    logger.info(`Deploying template job: ${job.id}`, { data: job.data });
    
    // Simulate template deployment
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    logger.info(`Template deployed successfully for job: ${job.id}`);
    return { success: true, jobId: job.id, deploymentId: `deploy-${Date.now()}` };
  },

  // Cleanup job
  'cleanup': async (job) => {
    logger.info(`Running cleanup job: ${job.id}`, { data: job.data });
    
    // Simulate cleanup tasks
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    logger.info(`Cleanup completed for job: ${job.id}`);
    return { success: true, jobId: job.id, cleaned: true };
  }
};

// Create worker
const worker = new Worker(QUEUE_NAME, async (job) => {
  const processor = processors[job.name];
  
  if (!processor) {
    throw new Error(`Unknown job type: ${job.name}`);
  }
  
  try {
    const result = await processor(job);
    logger.info(`Job completed successfully: ${job.id}`, { result });
    return result;
  } catch (error) {
    logger.error(`Job failed: ${job.id}`, { error: error.message, stack: error.stack });
    throw error;
  }
}, {
  connection: redis,
  concurrency: WORKER_CONCURRENCY,
  removeOnComplete: 100,
  removeOnFail: 50
});

// Worker event handlers
worker.on('completed', (job) => {
  logger.info(`Job completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job failed: ${job?.id}`, { error: err.message });
});

worker.on('error', (err) => {
  logger.error('Worker error:', { error: err.message, stack: err.stack });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  
  try {
    await worker.close();
    await redis.disconnect();
    
    server.close(() => {
      logger.info('Worker service shut down successfully');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', { error: error.message });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  
  try {
    await worker.close();
    await redis.disconnect();
    
    server.close(() => {
      logger.info('Worker service shut down successfully');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', { error: error.message });
    process.exit(1);
  }
});

// Start HTTP server
const server = app.listen(PORT, () => {
  logger.info(`Worker service running on port ${PORT}`);
  logger.info(`Connected to Redis: ${REDIS_URL}`);
  logger.info(`Processing queue: ${QUEUE_NAME}`);
  logger.info(`Worker concurrency: ${WORKER_CONCURRENCY}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});