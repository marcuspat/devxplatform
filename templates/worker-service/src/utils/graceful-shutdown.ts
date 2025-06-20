import { Server } from 'http';
import { Worker } from 'bullmq';
import { logger } from './logger';
import { closeRedisConnection } from '../config/redis';

export function gracefulShutdown(server?: Server | null, workers?: Worker[]): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    try {
      // Stop accepting new HTTP requests
      if (server) {
        await new Promise<void>((resolve) => {
          server.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Close workers gracefully
      if (workers && workers.length > 0) {
        logger.info(`Closing ${workers.length} workers...`);
        await Promise.all(
          workers.map(async (worker) => {
            try {
              await worker.close();
              logger.info(`Worker ${worker.name} closed`);
            } catch (error) {
              logger.error(`Error closing worker ${worker.name}:`, error);
            }
          })
        );
      }

      // Close Redis connection
      await closeRedisConnection();

      // Clean up other resources
      // TODO: Close database connections
      // TODO: Flush logs
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  // Handle termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}