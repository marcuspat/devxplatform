import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { Logger } from '../../observability/logging/logger';

export interface RateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  max: number;                // Max requests per window
  message?: string;           // Error message
  statusCode?: number;        // HTTP status code
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  handler?: (req: Request, res: Response) => void;
}

export interface RateLimitStore {
  increment(key: string): Promise<{ count: number; ttl: number }>;
  decrement(key: string): Promise<void>;
  reset(key: string): Promise<void>;
}

// In-memory rate limit store
export class InMemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    // Cleanup expired entries periodically
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, cleanupIntervalMs);
  }

  async increment(key: string): Promise<{ count: number; ttl: number }> {
    const now = Date.now();
    const existing = this.store.get(key);
    
    if (!existing || existing.resetTime < now) {
      const resetTime = now + 60000; // Default 1 minute
      this.store.set(key, { count: 1, resetTime });
      return { count: 1, ttl: 60 };
    }

    existing.count++;
    return {
      count: existing.count,
      ttl: Math.ceil((existing.resetTime - now) / 1000)
    };
  }

  async decrement(key: string): Promise<void> {
    const existing = this.store.get(key);
    if (existing && existing.count > 0) {
      existing.count--;
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Redis-backed rate limit store
export class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;
  private windowMs: number;

  constructor(redis: Redis, windowMs: number) {
    this.redis = redis;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ count: number; ttl: number }> {
    const multi = this.redis.multi();
    const ttlSeconds = Math.ceil(this.windowMs / 1000);
    
    multi.incr(key);
    multi.expire(key, ttlSeconds);
    multi.ttl(key);
    
    const results = await multi.exec();
    
    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const count = results[0][1] as number;
    const ttl = results[2][1] as number;

    return { count, ttl: ttl > 0 ? ttl : ttlSeconds };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(key);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

// Sliding window rate limiter using Redis
export class SlidingWindowRateLimitStore implements RateLimitStore {
  private redis: Redis;
  private windowMs: number;

  constructor(redis: Redis, windowMs: number) {
    this.redis = redis;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ count: number; ttl: number }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Count requests in window
    pipeline.zcount(key, windowStart, '+inf');
    
    // Set expiration
    pipeline.expire(key, Math.ceil(this.windowMs / 1000));
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const count = results[2][1] as number;
    
    return {
      count,
      ttl: Math.ceil(this.windowMs / 1000)
    };
  }

  async decrement(key: string): Promise<void> {
    // For sliding window, we remove the oldest entry
    await this.redis.zremrangebyrank(key, 0, 0);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

// Rate limiter middleware
export function rateLimiter(
  store: RateLimitStore,
  config: RateLimitConfig,
  logger?: Logger
) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
    skip,
    handler
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Check if should skip
    if (skip && skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    
    try {
      const { count, ttl } = await store.increment(key);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());

      if (count > max) {
        res.setHeader('Retry-After', ttl);
        
        logger?.warn('Rate limit exceeded', {
          key,
          count,
          limit: max,
          ip: req.ip,
          path: req.path
        });

        if (handler) {
          return handler(req, res);
        }

        return res.status(statusCode).json({ error: message });
      }

      // Handle decrement on response
      if (skipSuccessfulRequests || skipFailedRequests) {
        res.on('finish', async () => {
          if (
            (skipSuccessfulRequests && res.statusCode < 400) ||
            (skipFailedRequests && res.statusCode >= 400)
          ) {
            await store.decrement(key);
          }
        });
      }

      next();
    } catch (error) {
      logger?.error('Rate limiter error', error as Error, { key });
      // Fail open - allow request on error
      next();
    }
  };
}

// Default key generator (by IP)
function defaultKeyGenerator(req: Request): string {
  return `rate-limit:${req.ip || 'unknown'}`;
}

// Key generator by user ID
export function userKeyGenerator(req: Request): string {
  const user = (req as any).user;
  if (user?.userId) {
    return `rate-limit:user:${user.userId}`;
  }
  return defaultKeyGenerator(req);
}

// Key generator by API key
export function apiKeyGenerator(req: Request): string {
  const apiKey = (req as any).apiKey;
  if (apiKey?.id) {
    return `rate-limit:api:${apiKey.id}`;
  }
  return defaultKeyGenerator(req);
}

// Create multiple rate limiters with different configs
export function createRateLimiters(configs: {
  [name: string]: RateLimitConfig & { store?: RateLimitStore };
}, defaultStore: RateLimitStore, logger?: Logger) {
  const limiters: { [name: string]: any } = {};
  
  for (const [name, config] of Object.entries(configs)) {
    const store = config.store || defaultStore;
    limiters[name] = rateLimiter(store, config, logger);
  }
  
  return limiters;
}