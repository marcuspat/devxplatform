const { Queue } = require('bullmq');
const { connection } = require('../config/redis');
const config = require('../config');
const { JOB_TYPES } = require('../types/jobs');

// Create service generation queues
const serviceGenerationQueue = new Queue(JOB_TYPES.SERVICE_GENERATION, {
  connection,
  defaultJobOptions: config.queue.serviceGeneration,
});

const serviceBuildQueue = new Queue(JOB_TYPES.SERVICE_BUILD, {
  connection,
  defaultJobOptions: config.queue.defaultJobOptions,
});

const serviceDeploymentQueue = new Queue(JOB_TYPES.SERVICE_DEPLOYMENT, {
  connection,
  defaultJobOptions: config.queue.defaultJobOptions,
});

const serviceCleanupQueue = new Queue(JOB_TYPES.SERVICE_CLEANUP, {
  connection,
  defaultJobOptions: {
    ...config.queue.defaultJobOptions,
    attempts: 1, // Cleanup jobs should not be retried
  },
});

// Queue event handlers for monitoring
const queues = [
  serviceGenerationQueue,
  serviceBuildQueue,
  serviceDeploymentQueue,
  serviceCleanupQueue,
];

const queueNames = [
  'service_generation',
  'service_build',
  'service_deployment',
  'service_cleanup',
];

queues.forEach((queue, index) => {
  const queueName = queueNames[index];
  
  queue.on('error', (error) => {
    console.error(`❌ Queue ${queueName} error:`, error.message);
  });
  
  queue.on('waiting', (jobId) => {
    console.log(`⏳ Job ${jobId} is waiting in queue ${queueName}`);
  });
  
  queue.on('active', (job) => {
    console.log(`🔄 Job ${job.id} is now active in queue ${queueName}`);
  });
  
  queue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed in queue ${queueName}`);
  });
  
  queue.on('failed', (job, error) => {
    console.error(`❌ Job ${job.id} failed in queue ${queueName}:`, error.message);
  });
  
  queue.on('stalled', (jobId) => {
    console.warn(`⚠️ Job ${jobId} stalled in queue ${queueName}`);
  });
});

// Queue management functions
async function addServiceGenerationJob(jobData, options = {}) {
  try {
    const job = await serviceGenerationQueue.add(
      'generate_service',
      jobData,
      {
        ...options,
        jobId: jobData.jobId, // Use custom job ID for tracking
      }
    );
    
    console.log(`📝 Service generation job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Failed to add service generation job:', error);
    throw error;
  }
}

async function addServiceBuildJob(jobData, options = {}) {
  try {
    const job = await serviceBuildQueue.add(
      'build_service',
      jobData,
      {
        ...options,
        jobId: jobData.jobId,
      }
    );
    
    console.log(`🔨 Service build job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Failed to add service build job:', error);
    throw error;
  }
}

async function addServiceDeploymentJob(jobData, options = {}) {
  try {
    const job = await serviceDeploymentQueue.add(
      'deploy_service',
      jobData,
      {
        ...options,
        jobId: jobData.jobId,
      }
    );
    
    console.log(`🚀 Service deployment job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Failed to add service deployment job:', error);
    throw error;
  }
}

async function addServiceCleanupJob(jobData, options = {}) {
  try {
    const job = await serviceCleanupQueue.add(
      'cleanup_service',
      jobData,
      {
        ...options,
        jobId: jobData.jobId,
      }
    );
    
    console.log(`🧹 Service cleanup job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Failed to add service cleanup job:', error);
    throw error;
  }
}

// Job status and management functions
async function getJob(queueName, jobId) {
  const queue = getQueueByName(queueName);
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  
  return await queue.getJob(jobId);
}

async function getJobStatus(queueName, jobId) {
  const job = await getJob(queueName, jobId);
  if (!job) {
    return null;
  }
  
  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    timestamp: job.timestamp,
    attemptsMade: job.attemptsMade,
    opts: job.opts,
  };
}

async function cancelJob(queueName, jobId) {
  const job = await getJob(queueName, jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${queueName}`);
  }
  
  await job.remove();
  console.log(`🚫 Job ${jobId} cancelled in queue ${queueName}`);
  return true;
}

async function retryJob(queueName, jobId) {
  const job = await getJob(queueName, jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${queueName}`);
  }
  
  await job.retry();
  console.log(`🔄 Job ${jobId} retried in queue ${queueName}`);
  return true;
}

// Queue statistics
async function getQueueStats(queueName) {
  const queue = getQueueByName(queueName);
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  
  const waiting = await queue.getWaiting();
  const active = await queue.getActive();
  const completed = await queue.getCompleted();
  const failed = await queue.getFailed();
  const delayed = await queue.getDelayed();
  const paused = await queue.isPaused();
  
  return {
    name: queueName,
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    paused,
  };
}

async function getAllQueueStats() {
  const stats = {};
  
  for (const queueName of queueNames) {
    try {
      stats[queueName] = await getQueueStats(queueName);
    } catch (error) {
      console.error(`Failed to get stats for queue ${queueName}:`, error);
      stats[queueName] = { error: error.message };
    }
  }
  
  return stats;
}

// Helper function to get queue by name
function getQueueByName(queueName) {
  switch (queueName) {
    case JOB_TYPES.SERVICE_GENERATION:
      return serviceGenerationQueue;
    case JOB_TYPES.SERVICE_BUILD:
      return serviceBuildQueue;
    case JOB_TYPES.SERVICE_DEPLOYMENT:
      return serviceDeploymentQueue;
    case JOB_TYPES.SERVICE_CLEANUP:
      return serviceCleanupQueue;
    default:
      return null;
  }
}

// Graceful shutdown
async function closeQueues() {
  console.log('🔄 Closing queues...');
  
  const closePromises = queues.map(async (queue, index) => {
    try {
      await queue.close();
      console.log(`✅ Queue ${queueNames[index]} closed`);
    } catch (error) {
      console.error(`❌ Error closing queue ${queueNames[index]}:`, error);
    }
  });
  
  await Promise.all(closePromises);
  console.log('✅ All queues closed');
}

// Export all queues and functions
module.exports = {
  // Queue instances
  serviceGenerationQueue,
  serviceBuildQueue,
  serviceDeploymentQueue,
  serviceCleanupQueue,
  
  // Job creation functions
  addServiceGenerationJob,
  addServiceBuildJob,
  addServiceDeploymentJob,
  addServiceCleanupJob,
  
  // Job management functions
  getJob,
  getJobStatus,
  cancelJob,
  retryJob,
  
  // Queue statistics
  getQueueStats,
  getAllQueueStats,
  
  // Utility functions
  getQueueByName,
  closeQueues,
  
  // Queue arrays for iteration
  queues,
  queueNames,
};