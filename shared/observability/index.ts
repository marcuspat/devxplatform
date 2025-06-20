// Observability module exports
export * from './logging/logger';
export * from './tracing/tracer';
export * from './metrics/metrics';
export * from './middleware/correlation';
export * from './middleware/request-logger';

// Re-export commonly used functions and types
export { 
  createLogger,
  Logger,
  LogContext
} from './logging/logger';

export {
  createTracingService,
  tracingMiddleware,
  TracingConfig
} from './tracing/tracer';

export {
  createMetricsService,
  metricsEndpoint,
  MetricsConfig,
  CustomMetricDefinition
} from './metrics/metrics';

export {
  correlationMiddleware,
  getCorrelationContext,
  getCorrelationId,
  CorrelationContext
} from './middleware/correlation';

export {
  requestLoggerMiddleware,
  RequestLoggerOptions
} from './middleware/request-logger';