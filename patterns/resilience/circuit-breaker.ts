import CircuitBreaker from 'opossum';
import { EventEmitter } from 'events';
import { Logger } from 'winston';

export interface CircuitBreakerConfig {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
  fallback?: (...args: any[]) => any;
  logger?: Logger;
}

export interface CircuitBreakerMetrics {
  requests: number;
  failures: number;
  successes: number;
  timeouts: number;
  circuitOpen: boolean;
  fallbacks: number;
  latency: number[];
}

/**
 * Enhanced Circuit Breaker implementation with Hystrix-like features
 */
export class EnhancedCircuitBreaker<T extends (...args: any[]) => any> extends EventEmitter {
  private breaker: CircuitBreaker<T>;
  private metrics: CircuitBreakerMetrics;
  private logger?: Logger;
  private name: string;

  constructor(action: T, config: CircuitBreakerConfig = {}) {
    super();
    
    this.name = config.name || 'CircuitBreaker';
    this.logger = config.logger;
    
    const options: CircuitBreaker.Options = {
      timeout: config.timeout || 3000,
      errorThresholdPercentage: config.errorThresholdPercentage || 50,
      resetTimeout: config.resetTimeout || 30000,
      rollingCountTimeout: config.rollingCountTimeout || 10000,
      rollingCountBuckets: config.rollingCountBuckets || 10,
      name: this.name
    };

    this.breaker = new CircuitBreaker(action, options);
    
    if (config.fallback) {
      this.breaker.fallback(config.fallback);
    }

    this.metrics = {
      requests: 0,
      failures: 0,
      successes: 0,
      timeouts: 0,
      circuitOpen: false,
      fallbacks: 0,
      latency: []
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.breaker.on('fire', () => {
      this.metrics.requests++;
      this.emit('request');
    });

    this.breaker.on('success', (result, latency) => {
      this.metrics.successes++;
      this.metrics.latency.push(latency);
      this.emit('success', { result, latency });
      this.log('info', `Request successful in ${latency}ms`);
    });

    this.breaker.on('failure', (error) => {
      this.metrics.failures++;
      this.emit('failure', error);
      this.log('error', 'Request failed', error);
    });

    this.breaker.on('timeout', () => {
      this.metrics.timeouts++;
      this.emit('timeout');
      this.log('warn', 'Request timed out');
    });

    this.breaker.on('open', () => {
      this.metrics.circuitOpen = true;
      this.emit('open');
      this.log('warn', 'Circuit breaker opened');
    });

    this.breaker.on('halfOpen', () => {
      this.emit('halfOpen');
      this.log('info', 'Circuit breaker half-open');
    });

    this.breaker.on('close', () => {
      this.metrics.circuitOpen = false;
      this.emit('close');
      this.log('info', 'Circuit breaker closed');
    });

    this.breaker.on('fallback', (data) => {
      this.metrics.fallbacks++;
      this.emit('fallback', data);
      this.log('info', 'Fallback executed');
    });
  }

  private log(level: string, message: string, meta?: any): void {
    if (this.logger) {
      this.logger.log(level, `[${this.name}] ${message}`, meta);
    }
  }

  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    const startTime = Date.now();
    try {
      const result = await this.breaker.fire(...args);
      return result as ReturnType<T>;
    } finally {
      const endTime = Date.now();
      this.emit('execute', { duration: endTime - startTime });
    }
  }

  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  getStats(): CircuitBreaker.Stats {
    return this.breaker.stats;
  }

  isOpen(): boolean {
    return this.breaker.opened;
  }

  shutdown(): void {
    this.breaker.shutdown();
    this.removeAllListeners();
  }

  /**
   * Force the circuit to open
   */
  open(): void {
    this.breaker.open();
  }

  /**
   * Force the circuit to close
   */
  close(): void {
    this.breaker.close();
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = {
      requests: 0,
      failures: 0,
      successes: 0,
      timeouts: 0,
      circuitOpen: false,
      fallbacks: 0,
      latency: []
    };
  }

  /**
   * Get average latency
   */
  getAverageLatency(): number {
    if (this.metrics.latency.length === 0) return 0;
    const sum = this.metrics.latency.reduce((a, b) => a + b, 0);
    return sum / this.metrics.latency.length;
  }

  /**
   * Get success rate percentage
   */
  getSuccessRate(): number {
    if (this.metrics.requests === 0) return 100;
    return (this.metrics.successes / this.metrics.requests) * 100;
  }
}

/**
 * Factory function for creating circuit breakers
 */
export function createCircuitBreaker<T extends (...args: any[]) => any>(
  action: T,
  config?: CircuitBreakerConfig
): EnhancedCircuitBreaker<T> {
  return new EnhancedCircuitBreaker(action, config);
}