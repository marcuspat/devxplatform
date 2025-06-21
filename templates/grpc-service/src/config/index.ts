import Joi from 'joi';
import fs from 'fs';

// Interface for validated environment variables
interface ValidatedEnv {
  NODE_ENV: 'development' | 'production' | 'test' | 'staging';
  GRPC_HOST: string;
  GRPC_PORT: number;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
  GRPC_MAX_RECEIVE_MESSAGE_LENGTH: number;
  GRPC_MAX_SEND_MESSAGE_LENGTH: number;
  GRPC_KEEPALIVE_TIME_MS: number;
  GRPC_KEEPALIVE_TIMEOUT_MS: number;
  GRPC_KEEPALIVE_PERMIT_WITHOUT_CALLS: number;
  GRPC_MAX_CONCURRENT_STREAMS: number;
  TLS_CERT_PATH?: string;
  TLS_KEY_PATH?: string;
  TLS_CA_PATH?: string;
  TLS_CHECK_CLIENT_CERTIFICATE: boolean;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  METRICS_ENABLED: boolean;
  METRICS_PORT: number;
  DATABASE_URL?: string;
  DATABASE_POOL_SIZE: number;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  SENTRY_DSN?: string;
}

// Environment variable validation schema
const envSchema = Joi.object<ValidatedEnv>({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  GRPC_HOST: Joi.string().default('0.0.0.0'),
  GRPC_PORT: Joi.number().port().default(50051),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  
  // gRPC Configuration
  GRPC_MAX_RECEIVE_MESSAGE_LENGTH: Joi.number().default(4 * 1024 * 1024), // 4MB
  GRPC_MAX_SEND_MESSAGE_LENGTH: Joi.number().default(4 * 1024 * 1024), // 4MB
  GRPC_KEEPALIVE_TIME_MS: Joi.number().default(120000), // 2 minutes
  GRPC_KEEPALIVE_TIMEOUT_MS: Joi.number().default(20000), // 20 seconds
  GRPC_KEEPALIVE_PERMIT_WITHOUT_CALLS: Joi.number().default(1),
  GRPC_MAX_CONCURRENT_STREAMS: Joi.number().default(100),
  
  // TLS Configuration
  TLS_CERT_PATH: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TLS_KEY_PATH: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TLS_CA_PATH: Joi.string().optional(),
  TLS_CHECK_CLIENT_CERTIFICATE: Joi.boolean().default(false),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // Metrics
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9090),
  
  // Database
  DATABASE_URL: Joi.string().uri().optional(),
  DATABASE_POOL_SIZE: Joi.number().default(10),
  
  // Authentication
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('dev-secret'),
  }),
  JWT_EXPIRY: Joi.string().default('1d'),
  
  // Monitoring
  SENTRY_DSN: Joi.string().uri().optional(),
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

// Load TLS certificates if configured
const loadTlsFile = (path?: string): Buffer | null => {
  if (!path) return null;
  try {
    return fs.readFileSync(path);
  } catch (err) {
    throw new Error(`Failed to load TLS file ${path}: ${String(err)}`);
  }
};

export const config = {
  env: validatedEnv.NODE_ENV,
  host: validatedEnv.GRPC_HOST,
  port: validatedEnv.GRPC_PORT,
  isDevelopment: validatedEnv.NODE_ENV === 'development',
  isProduction: validatedEnv.NODE_ENV === 'production',
  isTest: validatedEnv.NODE_ENV === 'test',
  
  logging: {
    level: validatedEnv.LOG_LEVEL,
  },
  
  grpc: {
    maxReceiveMessageLength: validatedEnv.GRPC_MAX_RECEIVE_MESSAGE_LENGTH,
    maxSendMessageLength: validatedEnv.GRPC_MAX_SEND_MESSAGE_LENGTH,
    keepaliveTimeMs: validatedEnv.GRPC_KEEPALIVE_TIME_MS,
    keepaliveTimeoutMs: validatedEnv.GRPC_KEEPALIVE_TIMEOUT_MS,
    keepalivePermitWithoutCalls: validatedEnv.GRPC_KEEPALIVE_PERMIT_WITHOUT_CALLS,
    maxConcurrentStreams: validatedEnv.GRPC_MAX_CONCURRENT_STREAMS,
  },
  
  tls: {
    cert: loadTlsFile(validatedEnv.TLS_CERT_PATH),
    key: loadTlsFile(validatedEnv.TLS_KEY_PATH),
    ca: loadTlsFile(validatedEnv.TLS_CA_PATH),
    checkClientCertificate: validatedEnv.TLS_CHECK_CLIENT_CERTIFICATE,
  },
  
  rateLimit: {
    windowMs: validatedEnv.RATE_LIMIT_WINDOW_MS,
    maxRequests: validatedEnv.RATE_LIMIT_MAX_REQUESTS,
  },
  
  metrics: {
    enabled: validatedEnv.METRICS_ENABLED,
    port: validatedEnv.METRICS_PORT,
  },
  
  database: {
    url: validatedEnv.DATABASE_URL,
    poolSize: validatedEnv.DATABASE_POOL_SIZE,
  },
  
  auth: {
    jwtSecret: validatedEnv.JWT_SECRET,
    jwtExpiry: validatedEnv.JWT_EXPIRY,
  },
  
  monitoring: {
    sentryDsn: validatedEnv.SENTRY_DSN,
  },
} as const;

export type Config = typeof config;