import * as grpc from '@grpc/grpc-js';
import { config } from '../config';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Methods that are exempt from rate limiting
const EXEMPT_METHODS = [
  '/health.Health/Check',
  '/health.Health/Watch',
];

export const rateLimitInterceptor: grpc.ServerInterceptor = (call, callback, next) => {
  const methodName = call.getPath();
  
  // Skip rate limiting for exempt methods
  if (EXEMPT_METHODS.includes(methodName)) {
    return next(call, callback);
  }

  const clientIp = extractClientIp(call);
  const key = `${clientIp}:${methodName}`;
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  // Increment request count
  entry.count++;
  rateLimitStore.set(key, entry);

  // Check if rate limit exceeded
  if (entry.count > maxRequests) {
    const requestId = call.metadata.get('x-request-id')[0] as string;
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    logger.warn({
      requestId,
      method: methodName,
      clientIp,
      requestCount: entry.count,
      maxRequests,
      retryAfter,
      message: 'Rate limit exceeded',
    });

    // Add retry-after metadata
    const metadata = new grpc.Metadata();
    metadata.set('retry-after', retryAfter.toString());

    const error: grpc.ServiceError = {
      code: grpc.status.RESOURCE_EXHAUSTED,
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      name: 'RateLimitError',
      metadata,
    };

    return callback(error);
  }

  // Add rate limit headers to response metadata
  const responseMetadata = new grpc.Metadata();
  responseMetadata.set('x-ratelimit-limit', maxRequests.toString());
  responseMetadata.set('x-ratelimit-remaining', (maxRequests - entry.count).toString());
  responseMetadata.set('x-ratelimit-reset', Math.ceil(entry.resetTime / 1000).toString());
  
  // Send initial metadata with rate limit info
  call.sendMetadata(responseMetadata);

  next(call, callback);
};

function extractClientIp(call: grpc.ServerUnaryCall<any, any> | grpc.ServerWritableStream<any, any> | grpc.ServerReadableStream<any, any>): string {
  // Extract IP from peer information
  const peer = call.getPeer();
  
  // Parse peer string (format: "ipv4:127.0.0.1:12345" or "ipv6:[::1]:12345")
  const match = peer.match(/^ipv[46]:(.+):(\d+)$/);
  if (match) {
    let ip = match[1];
    // Remove brackets from IPv6 addresses
    if (ip.startsWith('[') && ip.endsWith(']')) {
      ip = ip.slice(1, -1);
    }
    return ip;
  }
  
  // Fallback to the full peer string
  return peer;
}

// Cleanup function to remove expired entries (call periodically)
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Set up periodic cleanup
setInterval(cleanupExpiredEntries, config.rateLimit.windowMs);