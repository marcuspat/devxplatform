/**
 * Job type definitions for the DevX Platform
 */

// Service generation job statuses
const JOB_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELAYED: 'delayed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
};

// Service generation job types
const JOB_TYPES = {
  SERVICE_GENERATION: 'service_generation',
  SERVICE_BUILD: 'service_build', 
  SERVICE_DEPLOYMENT: 'service_deployment',
  SERVICE_CLEANUP: 'service_cleanup',
};

// Service generation job progress stages
const JOB_PROGRESS_STAGES = {
  INITIALIZING: 'initializing',
  VALIDATING_TEMPLATE: 'validating_template',
  GENERATING_CODE: 'generating_code',
  INSTALLING_DEPENDENCIES: 'installing_dependencies',
  RUNNING_TESTS: 'running_tests',
  BUILDING_IMAGE: 'building_image',
  DEPLOYING: 'deploying',
  CLEANUP: 'cleanup',
  COMPLETED: 'completed',
};

/**
 * Service Generation Job Data Interface
 * @typedef {Object} ServiceGenerationJobData
 * @property {string} jobId - Unique job identifier
 * @property {string} serviceName - Name of the service to generate
 * @property {string} template - Template identifier to use
 * @property {string} environment - Target environment (dev, staging, prod)
 * @property {Object} resources - Resource allocation requirements
 * @property {number} resources.cpu - CPU cores
 * @property {number} resources.memory - Memory in GB
 * @property {Object} configuration - Service configuration
 * @property {string} userId - User who initiated the job
 * @property {string} timestamp - Job creation timestamp
 * @property {Object} metadata - Additional metadata
 */

/**
 * Job Progress Data Interface
 * @typedef {Object} JobProgressData
 * @property {string} stage - Current progress stage
 * @property {number} percentage - Progress percentage (0-100)
 * @property {string} message - Progress message
 * @property {Object} details - Additional progress details
 * @property {string} timestamp - Progress update timestamp
 */

/**
 * Job Result Data Interface
 * @typedef {Object} JobResultData
 * @property {boolean} success - Whether the job succeeded
 * @property {string} serviceId - Generated service ID (if successful)
 * @property {string} serviceUrl - Service URL (if deployed)
 * @property {string} dashboardUrl - Dashboard URL
 * @property {Object} artifacts - Generated artifacts
 * @property {Array} artifacts.files - List of generated files
 * @property {Object} artifacts.metadata - Service metadata
 * @property {string} error - Error message (if failed)
 * @property {Object} logs - Job execution logs
 * @property {number} duration - Job duration in milliseconds
 */

/**
 * Service Build Job Data Interface
 * @typedef {Object} ServiceBuildJobData
 * @property {string} serviceId - Service ID to build
 * @property {string} sourcePath - Path to service source code
 * @property {string} dockerfilePath - Path to Dockerfile
 * @property {Object} buildArgs - Docker build arguments
 * @property {string} imageTag - Docker image tag
 * @property {boolean} pushToRegistry - Whether to push to registry
 */

/**
 * Service Deployment Job Data Interface
 * @typedef {Object} ServiceDeploymentJobData
 * @property {string} serviceId - Service ID to deploy
 * @property {string} imageTag - Docker image tag to deploy
 * @property {string} environment - Target environment
 * @property {Object} envVars - Environment variables
 * @property {Object} resources - Resource allocation
 * @property {number} replicas - Number of replicas
 * @property {Object} healthCheck - Health check configuration
 */

/**
 * Service Cleanup Job Data Interface
 * @typedef {Object} ServiceCleanupJobData
 * @property {string} serviceId - Service ID to cleanup
 * @property {Array} resources - Resources to cleanup
 * @property {boolean} removeData - Whether to remove persistent data
 * @property {string} reason - Cleanup reason
 */

// Job creation helper functions
function createServiceGenerationJob(data) {
  return {
    type: JOB_TYPES.SERVICE_GENERATION,
    data: {
      jobId: require('uuid').v4(),
      timestamp: new Date().toISOString(),
      ...data,
    },
  };
}

function createServiceBuildJob(data) {
  return {
    type: JOB_TYPES.SERVICE_BUILD,
    data: {
      jobId: require('uuid').v4(),
      timestamp: new Date().toISOString(),
      ...data,
    },
  };
}

function createServiceDeploymentJob(data) {
  return {
    type: JOB_TYPES.SERVICE_DEPLOYMENT,
    data: {
      jobId: require('uuid').v4(),
      timestamp: new Date().toISOString(),
      ...data,
    },
  };
}

function createServiceCleanupJob(data) {
  return {
    type: JOB_TYPES.SERVICE_CLEANUP,
    data: {
      jobId: require('uuid').v4(),
      timestamp: new Date().toISOString(),
      ...data,
    },
  };
}

// Job validation helpers
function validateServiceGenerationJobData(data) {
  const required = ['serviceName', 'template', 'environment', 'userId'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  // Validate service name format
  if (!/^[a-z0-9-]+$/.test(data.serviceName)) {
    throw new Error('Service name must contain only lowercase letters, numbers, and hyphens');
  }
  
  // Validate environment
  if (!['development', 'staging', 'production'].includes(data.environment)) {
    throw new Error('Environment must be one of: development, staging, production');
  }
  
  return true;
}

module.exports = {
  JOB_STATUS,
  JOB_TYPES,
  JOB_PROGRESS_STAGES,
  createServiceGenerationJob,
  createServiceBuildJob,
  createServiceDeploymentJob,
  createServiceCleanupJob,
  validateServiceGenerationJobData,
};