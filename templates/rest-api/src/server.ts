import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import * as OpenApiValidator from 'express-openapi-validator';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { notFoundHandler } from './middleware/not-found';
import { healthRouter } from './routes/health';
import { apiRouter } from './routes/api';
import { config } from './config';
import { logger } from './utils/logger';
import path from 'path';

export async function createServer(): Promise<Express> {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors(config.cors));

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
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

  // Request logging
  app.use(requestLogger);

  // Health checks (before OpenAPI validation)
  app.use('/health', healthRouter);

  // OpenAPI validation
  app.use(
    OpenApiValidator.middleware({
      apiSpec: path.join(__dirname, '../openapi.yaml'),
      validateRequests: true,
      validateResponses: config.env !== 'production',
      validateFormats: 'full',
    })
  );

  // API routes
  app.use('/api', apiRouter);

  // Serve OpenAPI documentation
  app.use('/api-docs', express.static(path.join(__dirname, '../docs')));

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  logger.info('Server initialized successfully');
  return app;
}