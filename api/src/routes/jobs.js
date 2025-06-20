const express = require('express');
const { v4: uuidv4 } = require('uuid');
const {
  addServiceGenerationJob,
  addServiceBuildJob,
  addServiceDeploymentJob,
  addServiceCleanupJob,
  getJobStatus,
  cancelJob,
  retryJob,
  getAllQueueStats,
  getQueueStats,
} = require('../queues/index-simple');

const {
  createServiceGenerationJob,
  createServiceBuildJob,
  createServiceDeploymentJob,
  createServiceCleanupJob,
  validateServiceGenerationJobData,
  JOB_TYPES,
} = require('../types/jobs');

const router = express.Router();

// Middleware for request validation
const validateJobRequest = (req, res, next) => {
  const { jobType } = req.body;
  
  if (!jobType || !Object.values(JOB_TYPES).includes(jobType)) {
    return res.status(400).json({
      error: 'Invalid job type',
      validTypes: Object.values(JOB_TYPES),
    });
  }
  
  next();
};

/**
 * POST /api/jobs - Create a new job
 */
router.post('/', validateJobRequest, async (req, res) => {
  try {
    const { jobType, ...jobData } = req.body;
    
    let job;
    let jobId = uuidv4();
    
    switch (jobType) {
      case JOB_TYPES.SERVICE_GENERATION:
        // Validate service generation data
        validateServiceGenerationJobData(jobData);
        
        // Create and queue job
        const serviceGenData = createServiceGenerationJob({
          ...jobData,
          jobId,
        });
        
        job = await addServiceGenerationJob(serviceGenData.data);
        break;
        
      case JOB_TYPES.SERVICE_BUILD:
        const serviceBuildData = createServiceBuildJob({
          ...jobData,
          jobId,
        });
        
        job = await addServiceBuildJob(serviceBuildData.data);
        break;
        
      case JOB_TYPES.SERVICE_DEPLOYMENT:
        const serviceDeployData = createServiceDeploymentJob({
          ...jobData,
          jobId,
        });
        
        job = await addServiceDeploymentJob(serviceDeployData.data);
        break;
        
      case JOB_TYPES.SERVICE_CLEANUP:
        const serviceCleanupData = createServiceCleanupJob({
          ...jobData,
          jobId,
        });
        
        job = await addServiceCleanupJob(serviceCleanupData.data);
        break;
        
      default:
        return res.status(400).json({
          error: 'Unsupported job type',
        });
    }
    
    res.status(201).json({
      success: true,
      job: {
        id: job.id,
        jobId: jobId,
        type: jobType,
        status: 'pending',
        createdAt: new Date().toISOString(),
        data: job.data,
      },
    });
    
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      error: 'Failed to create job',
      message: error.message,
    });
  }
});

/**
 * GET /api/jobs/:jobId - Get job status
 */
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { queue } = req.query;
    
    if (!queue) {
      return res.status(400).json({
        error: 'Queue parameter is required',
      });
    }
    
    const jobStatus = await getJobStatus(queue, jobId);
    
    if (!jobStatus) {
      return res.status(404).json({
        error: 'Job not found',
      });
    }
    
    res.json({
      success: true,
      job: jobStatus,
    });
    
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message,
    });
  }
});

/**
 * POST /api/jobs/:jobId/cancel - Cancel a job
 */
router.post('/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { queue } = req.body;
    
    if (!queue) {
      return res.status(400).json({
        error: 'Queue parameter is required',
      });
    }
    
    const result = await cancelJob(queue, jobId);
    
    res.json({
      success: true,
      message: 'Job cancelled successfully',
      jobId,
    });
    
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      error: 'Failed to cancel job',
      message: error.message,
    });
  }
});

/**
 * POST /api/jobs/:jobId/retry - Retry a failed job
 */
router.post('/:jobId/retry', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { queue } = req.body;
    
    if (!queue) {
      return res.status(400).json({
        error: 'Queue parameter is required',
      });
    }
    
    const result = await retryJob(queue, jobId);
    
    res.json({
      success: true,
      message: 'Job retried successfully',
      jobId,
    });
    
  } catch (error) {
    console.error('Error retrying job:', error);
    res.status(500).json({
      error: 'Failed to retry job',
      message: error.message,
    });
  }
});

/**
 * GET /api/jobs/queues/stats - Get queue statistics
 */
router.get('/queues/stats', async (req, res) => {
  try {
    const { queue } = req.query;
    
    if (queue) {
      // Get stats for specific queue
      const stats = await getQueueStats(queue);
      res.json({
        success: true,
        queue: stats,
      });
    } else {
      // Get stats for all queues
      const stats = await getAllQueueStats();
      res.json({
        success: true,
        queues: stats,
      });
    }
    
  } catch (error) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({
      error: 'Failed to get queue statistics',
      message: error.message,
    });
  }
});

/**
 * POST /api/services - Create a new service (async via queue)
 * This replaces the old synchronous service creation
 */
router.post('/services', async (req, res) => {
  try {
    const {
      name: serviceName,
      template,
      environment = 'development',
      resources = { cpu: 0.5, memory: 1 },
      configuration = {},
    } = req.body;
    
    // Validate required fields
    if (!serviceName || !template) {
      return res.status(400).json({
        error: 'Service name and template are required',
      });
    }
    
    // Create service generation job
    const jobId = uuidv4();
    const serviceGenData = createServiceGenerationJob({
      serviceName,
      template,
      environment,
      resources,
      configuration,
      userId: req.user?.id || 'anonymous', // Assuming auth middleware sets req.user
      jobId,
    });
    
    const job = await addServiceGenerationJob(serviceGenData.data);
    
    res.status(202).json({
      success: true,
      message: 'Service generation job created successfully',
      job: {
        id: job.id,
        jobId: jobId,
        serviceName,
        template,
        environment,
        status: 'pending',
        createdAt: new Date().toISOString(),
        statusUrl: `/api/jobs/${jobId}?queue=${JOB_TYPES.SERVICE_GENERATION}`,
      },
    });
    
  } catch (error) {
    console.error('Error creating service generation job:', error);
    res.status(500).json({
      error: 'Failed to create service generation job',
      message: error.message,
    });
  }
});

/**
 * GET /api/health/queues - Health check for queues
 */
router.get('/health/queues', async (req, res) => {
  try {
    const { isRedisConnected } = require('../config/redis');
    const redisHealthy = await isRedisConnected();
    
    if (!redisHealthy) {
      return res.status(503).json({
        healthy: false,
        error: 'Redis connection failed',
      });
    }
    
    const stats = await getAllQueueStats();
    
    res.json({
      healthy: true,
      redis: {
        connected: redisHealthy,
      },
      queues: stats,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Queue health check failed:', error);
    res.status(503).json({
      healthy: false,
      error: 'Queue health check failed',
      message: error.message,
    });
  }
});

module.exports = router;