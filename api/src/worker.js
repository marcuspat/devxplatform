const { Worker } = require('bullmq');
const { connection } = require('./config/redis');
const config = require('./config');
const { JOB_TYPES } = require('./types/jobs');
const ServiceGenerationProcessor = require('./processors/serviceGenerationProcessor');

// Initialize processors
const serviceGenerationProcessor = new ServiceGenerationProcessor();

// Create workers for each queue
const serviceGenerationWorker = new Worker(
  JOB_TYPES.SERVICE_GENERATION,
  async (job) => {
    console.log(`🔄 Processing service generation job: ${job.id}`);
    return await serviceGenerationProcessor.process(job);
  },
  {
    connection,
    concurrency: config.queue.serviceGeneration.concurrency || 2,
    removeOnComplete: config.queue.serviceGeneration.removeOnComplete,
    removeOnFail: config.queue.serviceGeneration.removeOnFail,
  }
);

const serviceBuildWorker = new Worker(
  JOB_TYPES.SERVICE_BUILD,
  async (job) => {
    console.log(`🔄 Processing service build job: ${job.id}`);
    // Placeholder for build processor
    return await processServiceBuildJob(job);
  },
  {
    connection,
    concurrency: 1,
    removeOnComplete: 50,
    removeOnFail: 100,
  }
);

const serviceDeploymentWorker = new Worker(
  JOB_TYPES.SERVICE_DEPLOYMENT,
  async (job) => {
    console.log(`🔄 Processing service deployment job: ${job.id}`);
    // Placeholder for deployment processor
    return await processServiceDeploymentJob(job);
  },
  {
    connection,
    concurrency: 1,
    removeOnComplete: 50,
    removeOnFail: 100,
  }
);

const serviceCleanupWorker = new Worker(
  JOB_TYPES.SERVICE_CLEANUP,
  async (job) => {
    console.log(`🔄 Processing service cleanup job: ${job.id}`);
    // Placeholder for cleanup processor
    return await processServiceCleanupJob(job);
  },
  {
    connection,
    concurrency: 2,
    removeOnComplete: 10,
    removeOnFail: 50,
  }
);

// Worker event handlers
const workers = [
  { worker: serviceGenerationWorker, name: 'service_generation' },
  { worker: serviceBuildWorker, name: 'service_build' },
  { worker: serviceDeploymentWorker, name: 'service_deployment' },
  { worker: serviceCleanupWorker, name: 'service_cleanup' },
];

workers.forEach(({ worker, name }) => {
  worker.on('completed', (job, result) => {
    console.log(`✅ Worker ${name} completed job ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Worker ${name} failed job ${job.id}:`, error.message);
  });

  worker.on('error', (error) => {
    console.error(`❌ Worker ${name} error:`, error.message);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`⚠️ Worker ${name} job ${jobId} stalled`);
  });
});

// Placeholder processors for other job types
async function processServiceBuildJob(job) {
  const { serviceId, sourcePath, imageTag } = job.data;
  
  // Simulate build process
  await job.updateProgress({ 
    stage: 'building', 
    percentage: 50, 
    message: 'Building Docker image...' 
  });
  
  // Simulate build time
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await job.updateProgress({ 
    stage: 'completed', 
    percentage: 100, 
    message: 'Build completed successfully' 
  });
  
  return {
    success: true,
    serviceId,
    imageTag: imageTag || `${serviceId}:latest`,
    buildTime: Date.now() - job.timestamp,
  };
}

async function processServiceDeploymentJob(job) {
  const { serviceId, imageTag, environment } = job.data;
  
  // Simulate deployment process
  await job.updateProgress({ 
    stage: 'deploying', 
    percentage: 30, 
    message: 'Deploying to cluster...' 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await job.updateProgress({ 
    stage: 'health_check', 
    percentage: 70, 
    message: 'Running health checks...' 
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await job.updateProgress({ 
    stage: 'completed', 
    percentage: 100, 
    message: 'Deployment completed successfully' 
  });
  
  return {
    success: true,
    serviceId,
    imageTag,
    environment,
    serviceUrl: `https://${serviceId}.${environment}.devxplatform.com`,
    deploymentTime: Date.now() - job.timestamp,
  };
}

async function processServiceCleanupJob(job) {
  const { serviceId, resources } = job.data;
  
  // Simulate cleanup process
  await job.updateProgress({ 
    stage: 'cleaning', 
    percentage: 50, 
    message: 'Cleaning up resources...' 
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await job.updateProgress({ 
    stage: 'completed', 
    percentage: 100, 
    message: 'Cleanup completed successfully' 
  });
  
  return {
    success: true,
    serviceId,
    cleanedResources: resources || [],
    cleanupTime: Date.now() - job.timestamp,
  };
}

// Graceful shutdown
async function shutdown() {
  console.log('🔄 Shutting down workers...');
  
  const shutdownPromises = workers.map(async ({ worker, name }) => {
    try {
      await worker.close();
      console.log(`✅ Worker ${name} closed`);
    } catch (error) {
      console.error(`❌ Error closing worker ${name}:`, error);
    }
  });
  
  await Promise.all(shutdownPromises);
  
  // Close Redis connection
  try {
    await connection.quit();
    console.log('✅ Redis connection closed');
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
  }
  
  console.log('✅ Worker shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  shutdown();
});

console.log('🚀 Workers started successfully');
console.log(`📊 Service Generation Worker: ${config.queue.serviceGeneration.concurrency || 2} concurrent jobs`);
console.log(`📊 Service Build Worker: 1 concurrent job`);
console.log(`📊 Service Deployment Worker: 1 concurrent job`);
console.log(`📊 Service Cleanup Worker: 2 concurrent jobs`);

// Export workers for testing
module.exports = {
  serviceGenerationWorker,
  serviceBuildWorker,
  serviceDeploymentWorker,
  serviceCleanupWorker,
  shutdown,
};