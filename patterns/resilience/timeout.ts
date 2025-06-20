import { EventEmitter } from 'events';

export interface TimeoutConfig {
  timeout: number;
  name?: string;
  onTimeout?: () => void;
  cancelOnTimeout?: boolean;
}

export interface TimeoutMetrics {
  totalRequests: number;
  timedOutRequests: number;
  averageExecutionTime: number;
  maxExecutionTime: number;
}

/**
 * Enhanced timeout handler with metrics and cancellation support
 */
export class TimeoutHandler extends EventEmitter {
  private config: Required<TimeoutConfig>;
  private metrics: TimeoutMetrics;
  private executionTimes: number[] = [];

  constructor(config: TimeoutConfig) {
    super();
    this.config = {
      timeout: config.timeout,
      name: config.name || 'TimeoutHandler',
      onTimeout: config.onTimeout || (() => {}),
      cancelOnTimeout: config.cancelOnTimeout ?? true
    };

    this.metrics = {
      totalRequests: 0,
      timedOutRequests: 0,
      averageExecutionTime: 0,
      maxExecutionTime: 0
    };
  }

  /**
   * Execute a function with timeout
   */
  async execute<T>(
    fn: (signal?: AbortSignal) => Promise<T>,
    customTimeout?: number
  ): Promise<T> {
    const timeout = customTimeout || this.config.timeout;
    const startTime = Date.now();
    this.metrics.totalRequests++;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      if (this.config.cancelOnTimeout) {
        controller.abort();
      }
      this.metrics.timedOutRequests++;
      this.config.onTimeout();
      this.emit('timeout', { timeout, name: this.config.name });
    }, timeout);

    try {
      const result = await Promise.race([
        fn(controller.signal),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new TimeoutError(`Operation timed out after ${timeout}ms`)), timeout);
        })
      ]);

      clearTimeout(timeoutId);
      const executionTime = Date.now() - startTime;
      this.updateMetrics(executionTime);
      this.emit('success', { executionTime });
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      const executionTime = Date.now() - startTime;
      this.updateMetrics(executionTime);
      this.emit('error', { error, executionTime });
      throw error;
    }
  }

  private updateMetrics(executionTime: number): void {
    this.executionTimes.push(executionTime);
    this.metrics.maxExecutionTime = Math.max(this.metrics.maxExecutionTime, executionTime);
    this.metrics.averageExecutionTime = 
      this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length;
  }

  getMetrics(): TimeoutMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      timedOutRequests: 0,
      averageExecutionTime: 0,
      maxExecutionTime: 0
    };
    this.executionTimes = [];
  }
}

/**
 * Custom timeout error
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Utility function for simple timeout operations
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new TimeoutError(`Operation timed out after ${timeout}ms`)), timeout);
    })
  ]);
}

/**
 * Decorator for adding timeout to class methods
 */
export function Timeout(timeout: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withTimeout(() => originalMethod.apply(this, args), timeout);
    };

    return descriptor;
  };
}

/**
 * Adaptive timeout handler that adjusts timeout based on historical performance
 */
export class AdaptiveTimeoutHandler extends TimeoutHandler {
  private percentile: number;
  private minTimeout: number;
  private maxTimeout: number;

  constructor(
    config: TimeoutConfig & {
      percentile?: number;
      minTimeout?: number;
      maxTimeout?: number;
    }
  ) {
    super(config);
    this.percentile = config.percentile || 95;
    this.minTimeout = config.minTimeout || 100;
    this.maxTimeout = config.maxTimeout || 30000;
  }

  /**
   * Calculate adaptive timeout based on historical performance
   */
  getAdaptiveTimeout(): number {
    const times = this['executionTimes'];
    if (times.length < 10) {
      return this['config'].timeout;
    }

    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.ceil((this.percentile / 100) * sorted.length) - 1;
    const p95 = sorted[index];
    
    // Add 20% buffer
    const adaptiveTimeout = Math.round(p95 * 1.2);
    
    return Math.max(this.minTimeout, Math.min(this.maxTimeout, adaptiveTimeout));
  }

  async executeAdaptive<T>(
    fn: (signal?: AbortSignal) => Promise<T>
  ): Promise<T> {
    const timeout = this.getAdaptiveTimeout();
    return this.execute(fn, timeout);
  }
}