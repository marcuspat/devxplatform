import 'dotenv/config';
import { createServer } from './server';
import { logger } from './utils/logger';
import { config } from './config';
import { gracefulShutdown } from './utils/graceful-shutdown';

async function main() {
  try {
    const server = await createServer();
    
    server.bindAsync(
      `${config.host}:${config.port}`,
      config.isProduction
        ? require('@grpc/grpc-js').ServerCredentials.createSsl(
            config.tls.cert,
            [{
              cert_chain: config.tls.cert,
              private_key: config.tls.key,
            }],
            config.tls.checkClientCertificate
          )
        : require('@grpc/grpc-js').ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          logger.error('Failed to bind gRPC server:', error);
          process.exit(1);
        }
        
        logger.info(`gRPC server is running on port ${port} in ${config.env} mode`);
        logger.info(`Health check service available`);
        
        // Start metrics server if enabled
        if (config.metrics.enabled) {
          const { startMetricsServer } = require('./metrics');
          startMetricsServer();
        }
      }
    );

    // Graceful shutdown handling
    gracefulShutdown(server);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();