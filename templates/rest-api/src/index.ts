import 'dotenv/config';
import 'express-async-errors';
import { createServer } from './server';
import { logger } from './utils/logger';
import { config } from './config';
import { gracefulShutdown } from './utils/graceful-shutdown';

function main(): void {
  try {
    const server = createServer();
    
    const httpServer = server.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port} in ${config.env} mode`);
      logger.info(`Health check available at http://localhost:${config.port}/health`);
      logger.info(`API documentation available at http://localhost:${config.port}/api-docs`);
    });

    // Graceful shutdown handling
    gracefulShutdown(httpServer);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

void main();