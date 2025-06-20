import Joi from 'joi';

// Environment variable validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  MODE: Joi.string().valid('api', 'worker', 'both').default('api'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  
  // Redis Configuration
  REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),
  REDIS_MAX_RETRIES_PER_REQUEST: Joi.number().default(3),
  REDIS_RETRY_DELAY_ON_FAILURE: Joi.number().default(100),
  
  // Queue Configuration
  QUEUE_DEFAULT_JOB_OPTIONS_DELAY: Joi.number().default(0),
  QUEUE_DEFAULT_JOB_OPTIONS_ATTEMPTS: Joi.number().default(3),
  QUEUE_DEFAULT_JOB_OPTIONS_BACKOFF_TYPE: Joi.string().default('exponential'),
  QUEUE_DEFAULT_JOB_OPTIONS_BACKOFF_DELAY: Joi.number().default(2000),
  
  // Worker Configuration
  WORKER_EMAIL_CONCURRENCY: Joi.number().default(5),
  WORKER_FILE_CONCURRENCY: Joi.number().default(2),
  WORKER_REPORT_CONCURRENCY: Joi.number().default(1),
  WORKER_CLEANUP_CONCURRENCY: Joi.number().default(1),
  WORKER_WEBHOOK_CONCURRENCY: Joi.number().default(10),
  
  WORKER_REMOVE_ON_COMPLETE: Joi.number().default(100),
  WORKER_REMOVE_ON_FAIL: Joi.number().default(50),
  WORKER_MAX_STALLED_COUNT: Joi.number().default(1),
  WORKER_STALLED_INTERVAL: Joi.number().default(30000),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().default(100),
  
  // File Processing
  UPLOAD_DIR: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024), // 10MB
  ALLOWED_FILE_TYPES: Joi.string().default('jpg,jpeg,png,pdf,doc,docx'),
  
  // Email Configuration
  EMAIL_HOST: Joi.string().optional(),
  EMAIL_PORT: Joi.number().default(587),
  EMAIL_SECURE: Joi.boolean().default(false),
  EMAIL_USER: Joi.string().optional(),
  EMAIL_PASS: Joi.string().optional(),
  EMAIL_FROM: Joi.string().default('noreply@example.com'),
  
  // Webhook Configuration
  WEBHOOK_TIMEOUT: Joi.number().default(30000),
  WEBHOOK_MAX_RETRIES: Joi.number().default(3),
  
  // Metrics
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9090),
  
  // Monitoring
  SENTRY_DSN: Joi.string().uri().optional(),
  
  // Database (optional)
  DATABASE_URL: Joi.string().uri().optional(),
}).unknown();

// Validate environment variables
const { error, value: validatedEnv } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: validatedEnv.NODE_ENV,
  port: validatedEnv.PORT,
  mode: validatedEnv.MODE,
  isDevelopment: validatedEnv.NODE_ENV === 'development',
  isProduction: validatedEnv.NODE_ENV === 'production',
  isTest: validatedEnv.NODE_ENV === 'test',
  
  logging: {
    level: validatedEnv.LOG_LEVEL,
  },
  
  redis: {
    url: validatedEnv.REDIS_URL,
    maxRetriesPerRequest: validatedEnv.REDIS_MAX_RETRIES_PER_REQUEST,
    retryDelayOnFailure: validatedEnv.REDIS_RETRY_DELAY_ON_FAILURE,
  },
  
  queue: {
    defaultJobOptions: {
      delay: validatedEnv.QUEUE_DEFAULT_JOB_OPTIONS_DELAY,
      attempts: validatedEnv.QUEUE_DEFAULT_JOB_OPTIONS_ATTEMPTS,
      backoff: {
        type: validatedEnv.QUEUE_DEFAULT_JOB_OPTIONS_BACKOFF_TYPE,
        delay: validatedEnv.QUEUE_DEFAULT_JOB_OPTIONS_BACKOFF_DELAY,
      },
    },
  },
  
  workers: {
    email: {
      concurrency: validatedEnv.WORKER_EMAIL_CONCURRENCY,
      removeOnComplete: validatedEnv.WORKER_REMOVE_ON_COMPLETE,
      removeOnFail: validatedEnv.WORKER_REMOVE_ON_FAIL,
      maxStalledCount: validatedEnv.WORKER_MAX_STALLED_COUNT,
      stalledInterval: validatedEnv.WORKER_STALLED_INTERVAL,
    },
    file: {
      concurrency: validatedEnv.WORKER_FILE_CONCURRENCY,
      removeOnComplete: validatedEnv.WORKER_REMOVE_ON_COMPLETE,
      removeOnFail: validatedEnv.WORKER_REMOVE_ON_FAIL,
      maxStalledCount: validatedEnv.WORKER_MAX_STALLED_COUNT,
      stalledInterval: validatedEnv.WORKER_STALLED_INTERVAL,
    },
    report: {
      concurrency: validatedEnv.WORKER_REPORT_CONCURRENCY,
      removeOnComplete: validatedEnv.WORKER_REMOVE_ON_COMPLETE,
      removeOnFail: validatedEnv.WORKER_REMOVE_ON_FAIL,
      maxStalledCount: validatedEnv.WORKER_MAX_STALLED_COUNT,
      stalledInterval: validatedEnv.WORKER_STALLED_INTERVAL,
    },
    cleanup: {
      concurrency: validatedEnv.WORKER_CLEANUP_CONCURRENCY,
      removeOnComplete: validatedEnv.WORKER_REMOVE_ON_COMPLETE,
      removeOnFail: validatedEnv.WORKER_REMOVE_ON_FAIL,
      maxStalledCount: validatedEnv.WORKER_MAX_STALLED_COUNT,
      stalledInterval: validatedEnv.WORKER_STALLED_INTERVAL,
    },
    webhook: {
      concurrency: validatedEnv.WORKER_WEBHOOK_CONCURRENCY,
      removeOnComplete: validatedEnv.WORKER_REMOVE_ON_COMPLETE,
      removeOnFail: validatedEnv.WORKER_REMOVE_ON_FAIL,
      maxStalledCount: validatedEnv.WORKER_MAX_STALLED_COUNT,
      stalledInterval: validatedEnv.WORKER_STALLED_INTERVAL,
    },
  },
  
  rateLimit: {
    windowMs: validatedEnv.RATE_LIMIT_WINDOW_MS,
    max: validatedEnv.RATE_LIMIT_MAX,
  },
  
  files: {
    uploadDir: validatedEnv.UPLOAD_DIR,
    maxFileSize: validatedEnv.MAX_FILE_SIZE,
    allowedTypes: validatedEnv.ALLOWED_FILE_TYPES.split(','),
  },
  
  email: {
    host: validatedEnv.EMAIL_HOST,
    port: validatedEnv.EMAIL_PORT,
    secure: validatedEnv.EMAIL_SECURE,
    auth: validatedEnv.EMAIL_USER ? {
      user: validatedEnv.EMAIL_USER,
      pass: validatedEnv.EMAIL_PASS,
    } : undefined,
    from: validatedEnv.EMAIL_FROM,
  },
  
  webhook: {
    timeout: validatedEnv.WEBHOOK_TIMEOUT,
    maxRetries: validatedEnv.WEBHOOK_MAX_RETRIES,
  },
  
  metrics: {
    enabled: validatedEnv.METRICS_ENABLED,
    port: validatedEnv.METRICS_PORT,
  },
  
  monitoring: {
    sentryDsn: validatedEnv.SENTRY_DSN,
  },
  
  database: {
    url: validatedEnv.DATABASE_URL,
  },
} as const;

export type Config = typeof config;