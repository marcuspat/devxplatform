import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

// Create Redis connection for BullMQ
export const redisConnection = new Redis(config.redis.url, {
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
  retryDelayOnFailure: config.redis.retryDelayOnFailure,
  enableReadyCheck: false,
  maxLoadingTimeout: 0,
  lazyConnect: true,
});

// Redis event handlers
redisConnection.on('connect', () => {
  logger.info('Redis connection established');
});

redisConnection.on('ready', () => {
  logger.info('Redis connection ready');
});

redisConnection.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redisConnection.on('close', () => {
  logger.warn('Redis connection closed');
});

redisConnection.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

// Graceful Redis shutdown
export async function closeRedisConnection(): Promise<void> {
  try {
    await redisConnection.quit();
    logger.info('Redis connection closed gracefully');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
}