import { EventEmitter } from 'events';
import { Logger } from 'winston';

export interface FallbackConfig {
  name?: string;
  cache?: boolean;
  cacheTimeout?: number;
  logger?: Logger;
}

export interface FallbackResult<T> {
  value: T;
  source: 'primary' | 'fallback' | 'cache';
  error?: Error;
  timestamp: Date;
}

/**
 * Fallback pattern implementation for graceful degradation
 */
export class FallbackHandler<T> extends EventEmitter {
  private config: Required<FallbackConfig>;
  private cache: Map<string, { value: T; timestamp: number }> = new Map();
  private logger?: Logger;

  constructor(config: FallbackConfig = {}) {
    super();
    this.config = {
      name: config.name || 'FallbackHandler',
      cache: config.cache ?? true,
      cacheTimeout: config.cacheTimeout ?? 300000, // 5 minutes
      logger: config.logger!
    };
    this.logger = config.logger;
  }

  /**
   * Execute with fallback
   */
  async execute(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    cacheKey?: string
  ): Promise<FallbackResult<T>> {
    // Check cache first
    if (this.config.cache && cacheKey) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.emit('cache:hit', { cacheKey });
        return {
          value: cached,
          source: 'cache',
          timestamp: new Date()
        };
      }
    }

    // Try primary
    try {
      const startTime = Date.now();
      const value = await primary();
      const duration = Date.now() - startTime;
      
      if (this.config.cache && cacheKey) {
        this.setCache(cacheKey, value);
      }
      
      this.emit('primary:success', { duration });
      this.log('info', 'Primary execution successful', { duration });
      
      return {
        value,
        source: 'primary',
        timestamp: new Date()
      };
    } catch (primaryError) {
      this.emit('primary:error', { error: primaryError });
      this.log('warn', 'Primary execution failed, trying fallback', primaryError);
      
      // Try fallback
      try {
        const startTime = Date.now();
        const value = await fallback();
        const duration = Date.now() - startTime;
        
        if (this.config.cache && cacheKey) {
          this.setCache(cacheKey, value);
        }
        
        this.emit('fallback:success', { duration });
        this.log('info', 'Fallback execution successful', { duration });
        
        return {
          value,
          source: 'fallback',
          error: primaryError as Error,
          timestamp: new Date()
        };
      } catch (fallbackError) {
        this.emit('fallback:error', { error: fallbackError });
        this.log('error', 'Both primary and fallback failed', {
          primaryError,
          fallbackError
        });
        
        // Check stale cache as last resort
        if (this.config.cache && cacheKey) {
          const stale = this.getFromCache(cacheKey, true);
          if (stale) {
            this.emit('cache:stale', { cacheKey });
            this.log('warn', 'Using stale cache data');
            return {
              value: stale,
              source: 'cache',
              error: fallbackError as Error,
              timestamp: new Date()
            };
          }
        }
        
        throw fallbackError;
      }
    }
  }

  private getFromCache(key: string, includeStale = false): T | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;
    
    const isExpired = Date.now() - cached.timestamp > this.config.cacheTimeout;
    if (!isExpired || includeStale) {
      return cached.value;
    }
    
    return undefined;
  }

  private setCache(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  private log(level: string, message: string, meta?: any): void {
    if (this.logger) {
      this.logger.log(level, `[${this.config.name}] ${message}`, meta);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

/**
 * Multi-level fallback handler
 */
export class MultiLevelFallback<T> extends EventEmitter {
  private levels: Array<{
    name: string;
    handler: () => Promise<T>;
    timeout?: number;
  }> = [];
  private cache?: FallbackHandler<T>;

  constructor(private config?: { cache?: boolean; cacheTimeout?: number }) {
    super();
    if (config?.cache) {
      this.cache = new FallbackHandler<T>(config);
    }
  }

  /**
   * Add a fallback level
   */
  addLevel(name: string, handler: () => Promise<T>, timeout?: number): this {
    this.levels.push({ name, handler, timeout });
    return this;
  }

  /**
   * Execute with multi-level fallback
   */
  async execute(cacheKey?: string): Promise<FallbackResult<T>> {
    const errors: Array<{ level: string; error: Error }> = [];

    for (const level of this.levels) {
      try {
        const startTime = Date.now();
        
        let value: T;
        if (level.timeout) {
          value = await Promise.race([
            level.handler(),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`Timeout after ${level.timeout}ms`)), level.timeout);
            })
          ]);
        } else {
          value = await level.handler();
        }
        
        const duration = Date.now() - startTime;
        this.emit('level:success', { level: level.name, duration });
        
        return {
          value,
          source: level.name as any,
          timestamp: new Date()
        };
      } catch (error) {
        errors.push({ level: level.name, error: error as Error });
        this.emit('level:error', { level: level.name, error });
      }
    }

    // All levels failed
    this.emit('all:failed', { errors });
    throw new Error(`All fallback levels failed: ${errors.map(e => e.level).join(', ')}`);
  }
}

/**
 * Static fallback values
 */
export class StaticFallback<T> {
  constructor(private defaultValue: T) {}

  async execute(primary: () => Promise<T>): Promise<T> {
    try {
      return await primary();
    } catch {
      return this.defaultValue;
    }
  }

  wrap<F extends (...args: any[]) => Promise<T>>(
    fn: F
  ): (...args: Parameters<F>) => Promise<T> {
    return async (...args: Parameters<F>) => {
      try {
        return await fn(...args);
      } catch {
        return this.defaultValue;
      }
    };
  }
}

/**
 * Fallback decorator
 */
export function Fallback<T>(fallbackValue: T | (() => Promise<T>)) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (typeof fallbackValue === 'function') {
          return await (fallbackValue as () => Promise<T>)();
        }
        return fallbackValue;
      }
    };

    return descriptor;
  };
}

/**
 * Fallback strategies
 */
export class FallbackStrategies {
  /**
   * Percentage-based fallback (canary deployment style)
   */
  static percentage<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    percentage: number
  ): () => Promise<T> {
    return async () => {
      const usePrimary = Math.random() * 100 < percentage;
      return usePrimary ? primary() : fallback();
    };
  }

  /**
   * Time-based fallback (business hours, etc.)
   */
  static timeBased<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    shouldUsePrimary: () => boolean
  ): () => Promise<T> {
    return async () => {
      return shouldUsePrimary() ? primary() : fallback();
    };
  }

  /**
   * Load-based fallback
   */
  static loadBased<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    getLoad: () => number,
    threshold: number
  ): () => Promise<T> {
    return async () => {
      const currentLoad = getLoad();
      return currentLoad < threshold ? primary() : fallback();
    };
  }
}