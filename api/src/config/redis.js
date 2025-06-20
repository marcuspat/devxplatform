const Redis = require('ioredis');
const config = require('./index');

let redisConnection = null;

// Create Redis connection for BullMQ
function createRedisConnection() {
  if (redisConnection) {
    return redisConnection;
  }
  
  redisConnection = new Redis(config.redis.url, {
    maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
    retryDelayOnFailure: config.redis.retryDelayOnFailure,
    enableReadyCheck: config.redis.enableReadyCheck,
    maxLoadingTimeout: config.redis.maxLoadingTimeout,
    lazyConnect: config.redis.lazyConnect,
  });
  
  // Redis event handlers
  redisConnection.on('connect', () => {
    console.log('✅ Redis connection established');
  });

  redisConnection.on('ready', () => {
    console.log('✅ Redis connection ready');
  });

  redisConnection.on('error', (error) => {
    console.error('❌ Redis connection error:', error.message);
  });

  redisConnection.on('close', () => {
    console.warn('⚠️ Redis connection closed');
  });

  redisConnection.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });
  
  return redisConnection;
}

// Graceful Redis shutdown
async function closeRedisConnection() {
  if (redisConnection) {
    try {
      await redisConnection.quit();
      redisConnection = null;
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error);
    }
  }
}

// Health check function
async function isRedisConnected() {
  try {
    if (!redisConnection) {
      return false;
    }
    const result = await redisConnection.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

module.exports = {
  createRedisConnection,
  closeRedisConnection,
  isRedisConnected,
  get connection() {
    return redisConnection || createRedisConnection();
  }
};