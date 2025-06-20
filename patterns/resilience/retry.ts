import { backOff, IBackOffOptions } from 'exponential-backoff';

export interface RetryConfig extends Partial<IBackOffOptions> {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  jitter?: 'full' | 'none';
  onRetry?: (error: Error, attemptNumber: number) => void;
  shouldRetry?: (error: Error) => boolean;
  timeout?: number;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Default errors that should trigger a retry
 */
export const RETRYABLE_ERRORS = [
  'ECONNRESET',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ESOCKETTIMEDOUT',
  'EHOSTUNREACH',
  'EPIPE',
  'EAI_AGAIN'
];

/**
 * HTTP status codes that should trigger a retry
 */
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Enhanced retry mechanism with exponential backoff
 */
export class RetryHandler {
  private config: Required<RetryConfig>;

  constructor(config: RetryConfig = {}) {
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      initialDelay: config.startingDelay ?? config.initialDelay ?? 100,
      maxDelay: config.maxDelay ?? 30000,
      factor: config.delayFirstAttempt === false ? 0 : (config.factor ?? 2),
      jitter: config.jitter ?? 'full',
      onRetry: config.onRetry ?? (() => {}),
      shouldRetry: config.shouldRetry ?? this.defaultShouldRetry,
      timeout: config.timeMultiple ?? config.timeout ?? 300000,
      numOfAttempts: config.maxAttempts ?? 3,
      startingDelay: config.initialDelay ?? 100,
      delayFirstAttempt: config.delayFirstAttempt ?? true,
      timeMultiple: config.factor ?? 2,
      retry: config.retry ?? ((e: any) => this.config.shouldRetry(e))
    };
  }

  private defaultShouldRetry(error: any): boolean {
    // Network errors
    if (error.code && RETRYABLE_ERRORS.includes(error.code)) {
      return true;
    }

    // HTTP errors
    if (error.response?.status && RETRYABLE_STATUS_CODES.includes(error.response.status)) {
      return true;
    }

    // Timeout errors
    if (error.message?.toLowerCase().includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const mergedConfig = { ...this.config, ...customConfig };
    const startTime = Date.now();
    let attempts = 0;

    try {
      const result = await backOff(async () => {
        attempts++;
        try {
          return await fn();
        } catch (error) {
          if (attempts < mergedConfig.maxAttempts && mergedConfig.shouldRetry(error as Error)) {
            mergedConfig.onRetry(error as Error, attempts);
            throw error;
          }
          throw error;
        }
      }, {
        numOfAttempts: mergedConfig.numOfAttempts,
        startingDelay: mergedConfig.startingDelay,
        maxDelay: mergedConfig.maxDelay,
        delayFirstAttempt: mergedConfig.delayFirstAttempt,
        timeMultiple: mergedConfig.timeMultiple,
        jitter: mergedConfig.jitter,
        retry: mergedConfig.retry
      });

      return {
        success: true,
        result,
        attempts,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        attempts,
        totalTime: Date.now() - startTime
      };
    }
  }

  /**
   * Create a wrapped function with retry logic
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    customConfig?: Partial<RetryConfig>
  ): T {
    return (async (...args: Parameters<T>) => {
      const result = await this.execute(() => fn(...args), customConfig);
      if (result.success) {
        return result.result;
      }
      throw result.error;
    }) as T;
  }
}

/**
 * Utility function for simple retry operations
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): Promise<T> {
  const handler = new RetryHandler(config);
  const result = await handler.execute(fn);
  
  if (result.success) {
    return result.result!;
  }
  
  throw result.error;
}

/**
 * Decorator for adding retry logic to class methods
 */
export function Retry(config?: RetryConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const handler = new RetryHandler(config);

    descriptor.value = async function (...args: any[]) {
      return withRetry(() => originalMethod.apply(this, args), config);
    };

    return descriptor;
  };
}

/**
 * Advanced retry patterns
 */
export class AdvancedRetryPatterns {
  /**
   * Retry with circuit breaker integration
   */
  static async retryWithCircuitBreaker<T>(
    fn: () => Promise<T>,
    retryConfig: RetryConfig,
    circuitBreaker: any
  ): Promise<T> {
    if (circuitBreaker.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    return withRetry(fn, retryConfig);
  }

  /**
   * Retry with progressive timeout
   */
  static async retryWithProgressiveTimeout<T>(
    fn: () => Promise<T>,
    config: RetryConfig & { timeoutMultiplier?: number }
  ): Promise<T> {
    let currentTimeout = config.timeout || 5000;
    const timeoutMultiplier = config.timeoutMultiplier || 1.5;

    const wrappedFn = async () => {
      return Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), currentTimeout);
        })
      ]);
    };

    const handler = new RetryHandler({
      ...config,
      onRetry: (error, attempt) => {
        currentTimeout *= timeoutMultiplier;
        config.onRetry?.(error, attempt);
      }
    });

    const result = await handler.execute(wrappedFn);
    if (result.success) {
      return result.result!;
    }
    throw result.error;
  }
}