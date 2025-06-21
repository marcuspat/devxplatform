import 'dotenv/config';
import { Server, ServerCredentials } from '@grpc/grpc-js';
import { createServer } from './server';
import { logger } from './utils/logger';
import { config } from './config';
import { gracefulShutdown } from './utils/graceful-shutdown';
import { startMetricsServer } from './metrics';

function main() {
  try {
    const server = createServer();
    
    server.bindAsync(
      `${config.host}:${config.port}`,
      config.isProduction
        ? ServerCredentials.createSsl(
            config.tls.cert,
            [{
              cert_chain: config.tls.cert,
              private_key: config.tls.key,
            }],
            config.tls.checkClientCertificate
          )
        : ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          logger.error('Failed to bind gRPC server:', error);
          process.exit(1);
        }
        
        logger.info(`gRPC server is running on port ${port} in ${config.env} mode`);
        logger.info(`Health check service available`);
        
        // Start metrics server if enabled
        if (config.metrics.enabled) {
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

void main();