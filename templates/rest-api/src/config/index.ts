import Joi from 'joi';

// Interface for validated environment variables
interface ValidatedEnv {
  NODE_ENV: 'development' | 'production' | 'test' | 'staging';
  PORT: number;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
  BODY_LIMIT: string;
  SHUTDOWN_TIMEOUT_MS: number;
  DATABASE_URL?: string;
  DATABASE_POOL_SIZE: number;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  REDIS_URL?: string;
  SENTRY_DSN?: string;
  NEW_RELIC_LICENSE_KEY?: string;
}

// Environment variable validation schema
const envSchema = Joi.object<ValidatedEnv>({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().default(100),
  BODY_LIMIT: Joi.string().default('10mb'),
  SHUTDOWN_TIMEOUT_MS: Joi.number().default(30000), // 30 seconds
  
  // Database configuration (example)
  DATABASE_URL: Joi.string().uri().optional(),
  DATABASE_POOL_SIZE: Joi.number().default(10),
  
  // Authentication (example)
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('dev-secret'),
  }),
  JWT_EXPIRY: Joi.string().default('1d'),
  
  // External services (example)
  REDIS_URL: Joi.string().uri().optional(),
  
  // Monitoring
  SENTRY_DSN: Joi.string().uri().optional(),
  NEW_RELIC_LICENSE_KEY: Joi.string().optional(),
}).unknown();

// Validate environment variables
const { error, value: validatedEnv } = envSchema.validate(process.env) as {
  error?: Error;
  value?: ValidatedEnv;
};

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Ensure we have a valid environment object
if (!validatedEnv) {
  throw new Error('Environment validation failed');
}

export const config = {
  env: validatedEnv.NODE_ENV,
  port: validatedEnv.PORT,
  isDevelopment: validatedEnv.NODE_ENV === 'development',
  isProduction: validatedEnv.NODE_ENV === 'production',
  isTest: validatedEnv.NODE_ENV === 'test',
  
  logging: {
    level: validatedEnv.LOG_LEVEL,
  },
  
  cors: {
    origin: validatedEnv.CORS_ORIGIN,
    credentials: true,
  },
  
  rateLimit: {
    windowMs: validatedEnv.RATE_LIMIT_WINDOW_MS,
    max: validatedEnv.RATE_LIMIT_MAX,
  },
  
  bodyLimit: validatedEnv.BODY_LIMIT,
  shutdownTimeout: validatedEnv.SHUTDOWN_TIMEOUT_MS,
  
  database: {
    url: validatedEnv.DATABASE_URL,
    poolSize: validatedEnv.DATABASE_POOL_SIZE,
  },
  
  auth: {
    jwtSecret: validatedEnv.JWT_SECRET,
    jwtExpiry: validatedEnv.JWT_EXPIRY,
  },
  
  redis: {
    url: validatedEnv.REDIS_URL,
  },
  
  monitoring: {
    sentryDsn: validatedEnv.SENTRY_DSN,
    newRelicKey: validatedEnv.NEW_RELIC_LICENSE_KEY,
  },
} as const;

export type Config = typeof config;