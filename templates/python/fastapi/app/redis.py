"""
Redis configuration for caching and session management
"""

import json
from typing import Any, Optional

import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool

from app.config import settings

# Global Redis pool
redis_pool: Optional[ConnectionPool] = None


async def init_redis_pool() -> None:
    """Initialize Redis connection pool"""
    global redis_pool
    try:
        redis_pool = redis.ConnectionPool.from_url(
            str(settings.REDIS_URL),
            max_connections=settings.REDIS_POOL_SIZE,
            decode_responses=settings.REDIS_DECODE_RESPONSES,
        )
    except Exception as e:
        # Log the error but allow the app to start for development
        import logging

        logging.warning(f"Redis connection failed during init: {e}")
        logging.warning("Application will start without Redis connection")


async def close_redis_pool() -> None:
    """Close Redis connection pool"""
    global redis_pool
    if redis_pool:
        await redis_pool.disconnect()
        redis_pool = None


async def get_redis() -> redis.Redis:
    """Get Redis client instance"""
    if not redis_pool:
        raise RuntimeError("Redis pool not initialized")
    return redis.Redis(connection_pool=redis_pool)


class RedisCache:
    """Redis cache wrapper with JSON serialization"""

    def __init__(self, prefix: str = "cache"):
        self.prefix = prefix

    def _make_key(self, key: str) -> str:
        """Create prefixed key"""
        return f"{self.prefix}:{key}"

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        redis_client = await get_redis()
        value = await redis_client.get(self._make_key(key))
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None

    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> None:
        """Set value in cache with optional expiration"""
        redis_client = await get_redis()
        if not isinstance(value, str):
            value = json.dumps(value)
        await redis_client.set(self._make_key(key), value, ex=expire)

    async def delete(self, key: str) -> None:
        """Delete value from cache"""
        redis_client = await get_redis()
        await redis_client.delete(self._make_key(key))

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        redis_client = await get_redis()
        return bool(await redis_client.exists(self._make_key(key)))

    async def expire(self, key: str, seconds: int) -> None:
        """Set expiration on existing key"""
        redis_client = await get_redis()
        await redis_client.expire(self._make_key(key), seconds)

    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment counter"""
        redis_client = await get_redis()
        return await redis_client.incr(self._make_key(key), amount)

    async def decrement(self, key: str, amount: int = 1) -> int:
        """Decrement counter"""
        redis_client = await get_redis()
        return await redis_client.decr(self._make_key(key), amount)
