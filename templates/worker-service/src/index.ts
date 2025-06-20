import 'dotenv/config';
import { config } from './config';
import { logger } from './utils/logger';
import { gracefulShutdown } from './utils/graceful-shutdown';
import { startApiServer } from './api/server';
import { startWorker } from './worker';

async function main() {
  try {
    const mode = process.env.MODE || 'api';
    
    logger.info(`Starting ${mode} server in ${config.env} mode`);

    if (mode === 'worker') {
      // Start worker processes
      const workerProcesses = await startWorker();
      gracefulShutdown(null, workerProcesses);
    } else if (mode === 'both') {
      // Start both API server and worker
      const server = await startApiServer();
      const workerProcesses = await startWorker();
      gracefulShutdown(server, workerProcesses);
    } else {
      // Start API server only (default)
      const server = await startApiServer();
      gracefulShutdown(server);
    }

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

main();