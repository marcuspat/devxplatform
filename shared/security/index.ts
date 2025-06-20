// Security module exports
export * from './auth/jwt';
export * from './auth/api-key';
export * from './ratelimit/rate-limiter';
export * from './middleware/cors';
export * from './middleware/security-headers';
export * from './validation/validator';

// Re-export commonly used functions and types
export {
  createJWTService,
  jwtAuthMiddleware,
  requireRole,
  requirePermission,
  JWTConfig,
  JWTPayload
} from './auth/jwt';

export {
  createAPIKeyService,
  apiKeyAuthMiddleware,
  requireAPIScope,
  APIKeyConfig,
  APIKeyInfo,
  InMemoryAPIKeyValidator,
  DatabaseAPIKeyValidator
} from './auth/api-key';

export {
  rateLimiter,
  InMemoryRateLimitStore,
  RedisRateLimitStore,
  SlidingWindowRateLimitStore,
  RateLimitConfig
} from './ratelimit/rate-limiter';

export {
  cors,
  strictCORS,
  developmentCORS,
  apiCORS,
  CORSOptions
} from './middleware/cors';

export {
  securityHeaders,
  defaultSecurityHeaders,
  apiSecurityHeaders,
  SecurityHeadersOptions
} from './middleware/security-headers';

export {
  validate,
  commonSchemas,
  schemaBuilders,
  preventSQLInjection,
  preventXSS,
  ValidationOptions,
  ValidationError,
  sanitizers
} from './validation/validator';