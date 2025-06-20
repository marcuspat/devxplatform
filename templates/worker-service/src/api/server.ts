import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createBullBoard } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/bullmq';
import { Server } from 'http';

import { config } from '../config';
import { logger } from '../utils/logger';
import { requestLogger } from '../middleware/request-logger';
import { errorHandler } from '../middleware/error-handler';
import { notFoundHandler } from '../middleware/not-found';
import { healthRouter } from './routes/health';
import { jobsRouter } from './routes/jobs';
import { allQueues } from '../queues';
import { startMetricsServer } from '../metrics';

export async function startApiServer(): Promise<Server> {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.isDevelopment ? '*' : process.env.CORS_ORIGIN,
    credentials: true,
  }));

  // Compression
  app.use(compression());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Health checks
  app.use('/health', healthRouter);

  // API routes
  app.use('/api/jobs', jobsRouter);

  // Bull Board UI for queue monitoring
  const serverAdapter = createBullBoard({
    queues: Object.values(allQueues).map(queue => new BullMQAdapter(queue)),
    serverAdapter: new (require('@bull-board/express').ExpressAdapter)(),
  });

  serverAdapter.setBasePath('/admin/queues');
  app.use('/admin/queues', serverAdapter.getRouter());

  // API root endpoint
  app.get('/api', (req, res) => {
    res.json({
      message: 'Worker Service API',
      version: '1.0.0',
      endpoints: {
        jobs: '/api/jobs',
        health: '/health',
        monitoring: '/admin/queues',
        metrics: `http://localhost:${config.metrics.port}/metrics`,
      },
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  const server = app.listen(config.port, () => {
    logger.info(`API server is running on port ${config.port} in ${config.env} mode`);
    logger.info(`Queue monitoring available at http://localhost:${config.port}/admin/queues`);
    logger.info(`Health check available at http://localhost:${config.port}/health`);
  });

  // Start metrics server if enabled
  if (config.metrics.enabled) {
    startMetricsServer();
  }

  logger.info('API server initialized successfully');
  return server;
}