// Main shared modules export
export * as observability from './observability';
export * as security from './security';

// Direct exports for convenience
export {
  // Observability
  createLogger,
  Logger,
  LogContext,
  createTracingService,
  tracingMiddleware,
  createMetricsService,
  metricsEndpoint,
  correlationMiddleware,
  getCorrelationContext,
  requestLoggerMiddleware
} from './observability';

export {
  // Security - Auth
  createJWTService,
  jwtAuthMiddleware,
  createAPIKeyService,
  apiKeyAuthMiddleware,
  
  // Security - Middleware
  rateLimiter,
  cors,
  securityHeaders,
  
  // Security - Validation
  validate,
  commonSchemas,
  preventSQLInjection,
  preventXSS,
  
  // Types
  JWTConfig,
  JWTPayload,
  APIKeyConfig,
  APIKeyInfo,
  RateLimitConfig,
  CORSOptions,
  SecurityHeadersOptions,
  ValidationOptions
} from './security';