import * as grpc from '@grpc/grpc-js';
import { logger } from './logger';

export function gracefulShutdown(server: grpc.Server): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    try {
      // Try graceful shutdown first
      await new Promise<void>((resolve, reject) => {
        server.tryShutdown((error) => {
          if (error) {
            logger.warn('Graceful shutdown failed, forcing shutdown:', error);
            server.forceShutdown();
            resolve();
          } else {
            logger.info('gRPC server shutdown gracefully');
            resolve();
          }
        });
      });

      // Clean up resources
      // TODO: Close database connections
      // TODO: Close Redis connections
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