import 'reflect-metadata';
import 'dotenv/config';
import { createServer } from './server';
import { logger } from './utils/logger';
import { config } from './config';
import { gracefulShutdown } from './utils/graceful-shutdown';

async function main() {
  try {
    const { app: _app, httpServer } = await createServer();
    
    httpServer.listen(config.port, () => {
      logger.info(`GraphQL server is running on port ${config.port} in ${config.env} mode`);
      logger.info(`GraphQL playground available at http://localhost:${config.port}/graphql`);
      logger.info(`Health check available at http://localhost:${config.port}/health`);
    });

    // Graceful shutdown handling
    gracefulShutdown(httpServer);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();