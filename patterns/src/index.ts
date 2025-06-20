// Resilience patterns
export * from '../resilience';

// Testing patterns
export * from '../testing';

// Re-export main patterns
export {
  createCircuitBreaker,
  withRetry,
  withTimeout,
  getGlobalShutdownManager,
  onShutdown
} from '../resilience';

export {
  BaseTestTemplate,
  ServiceTestTemplate,
  factory,
  jestCoverageConfig,
  LoadTestGenerator
} from '../testing';