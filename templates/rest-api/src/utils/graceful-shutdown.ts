import { Server } from 'http';
import { Socket } from 'net';
import { logger } from './logger';
import { config } from '../config';

export function gracefulShutdown(server: Server): void {
  // Track connections
  const connections = new Set<Socket>();
  
  server.on('connection', (connection) => {
    connections.add(connection);
    connection.on('close', () => {
      connections.delete(connection);
    });
  });
  
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Close existing connections
    connections.forEach((connection) => {
      connection.end();
    });
    
    // Force close after timeout
    setTimeout(() => {
      connections.forEach((connection) => {
        connection.destroy();
      });
    }, config.shutdownTimeout / 2);
    
    // Wait for server to close
    await new Promise<void>((resolve) => {
      server.on('close', resolve);
      setTimeout(resolve, config.shutdownTimeout);
    });
    
    // Clean up resources
    try {
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
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    void shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    void shutdown('unhandledRejection');
  });
}