import Joi from 'joi';

// Environment variable validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX: Joi.number().default(100),
  BODY_LIMIT: Joi.string().default('10mb'),
  SHUTDOWN_TIMEOUT_MS: Joi.number().default(30000), // 30 seconds
  
  // GraphQL specific
  GRAPHQL_MAX_DEPTH: Joi.number().default(7),
  GRAPHQL_MAX_COMPLEXITY: Joi.number().default(1000),
  GRAPHQL_RATE_LIMIT_MAX: Joi.number().default(50),
  GRAPHQL_RATE_LIMIT_WINDOW: Joi.string().default('15m'),
  
  // Database configuration
  DATABASE_URL: Joi.string().uri().optional(),
  DATABASE_POOL_SIZE: Joi.number().default(10),
  
  // Authentication
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('dev-secret'),
  }),
  JWT_EXPIRY: Joi.string().default('1d'),
  
  // External services
  REDIS_URL: Joi.string().uri().optional(),
  
  // Monitoring
  SENTRY_DSN: Joi.string().uri().optional(),
  APOLLO_KEY: Joi.string().optional(),
}).unknown();

// Validate environment variables
const { error, value: validatedEnv } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
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
  
  graphql: {
    maxDepth: validatedEnv.GRAPHQL_MAX_DEPTH,
    maxComplexity: validatedEnv.GRAPHQL_MAX_COMPLEXITY,
    rateLimit: {
      max: validatedEnv.GRAPHQL_RATE_LIMIT_MAX,
      window: validatedEnv.GRAPHQL_RATE_LIMIT_WINDOW,
    },
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
    apolloKey: validatedEnv.APOLLO_KEY,
  },
} as const;

export type Config = typeof config;