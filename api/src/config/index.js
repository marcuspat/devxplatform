require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://devx:devx_secure_password@localhost:5432/devxplatform',
  },
  
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://:devx_redis_password@localhost:6379',
    maxRetriesPerRequest: 3,
    retryDelayOnFailure: 100,
    enableReadyCheck: false,
    maxLoadingTimeout: 0,
    lazyConnect: true,
  },
  
  // Queue configuration
  queue: {
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
    
    // Service generation specific options
    serviceGeneration: {
      concurrency: 2,
      attempts: 3,
      backoff: {
        type: 'exponential', 
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'devx_jwt_secret_change_in_production',
    expiresIn: '24h',
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  
  // Service generation configuration
  serviceGeneration: {
    templatesPath: process.env.TEMPLATES_PATH || './templates',
    outputPath: process.env.OUTPUT_PATH || './generated-services',
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS) || 5,
    jobTimeout: parseInt(process.env.JOB_TIMEOUT) || 300000, // 5 minutes
  },
};