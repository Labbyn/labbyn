"""Redis service for caching using aioredis."""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from dotenv import load_dotenv
from redis import RedisError

from app.core import exceptions

logger = logging.getLogger(__name__)
load_dotenv(".env/api.env")
REDIS_URL = os.getenv("REDIS_URL")
COLLECT_TIMEOUT = int(os.getenv("COLLECT_TIMEOUT"))


# pylint: disable=too-few-public-methods
class RedisClientManager:
    """Singleton class to manage Redis Connection."""

    def __init__(self):
        """Initialize fields."""
        self.client = None
        self._loop = None

    async def get_client(self):
        """Get a singleton Redis client instance."""
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            return await aioredis.from_url(REDIS_URL, decode_responses=True)
        if self.client is not None and self._loop is not current_loop:
            self.client = None
            self._loop = None

        if self.client is None:
            self.client = await aioredis.from_url(
                REDIS_URL, encoding="utf-8", decode_responses=True
            )
            self._loop = current_loop

        return self.client

    async def close(self):
        """Close the Redis client connection."""
        if self.client is not None:
            try:
                current_loop = asyncio.get_running_loop()
                if self._loop is current_loop:
                    await self.client.aclose()
            except Exception:
                logger.warning("Failed to close redis connection, ignoring.")
            finally:
                self.client = None
                self._loop = None


redis_manager = RedisClientManager()


async def get_redis_client():
    """Get a singleton Redis client instance.

    :return: aioredis Redis client.
    """
    return await redis_manager.get_client()


async def set_cache(key: str, value: str):
    """Set a value in Redis cache with an expiration time.

    :param key: Cache key
    :param value: Cache value
    :param expire: Expiration time in seconds.
    """
    redis_client = await get_redis_client()
    await redis_client.set(key, value, ex=COLLECT_TIMEOUT)


async def get_cache(key: str):
    """Get a value from Redis cache by key.

    :param key: Search for value by key
    :return: Value from redis cache.
    """
    r = await get_redis_client()
    return await r.get(key)


@asynccontextmanager
async def acquire_lock(
    lock_name: str, timeout: int = COLLECT_TIMEOUT, wait_timeout: int = 5
):
    """Context manager for Redis distributed lock.

    Uses shared Redis client connection.
    :param lock_name: Unique key for the lock, eg. lock:machine:1
    :param timeout: Auto-release time in seconds
    :param wait_timeout: Waiting for lock before dropping
    :return: None.
    """
    client = await get_redis_client()
    lock = client.lock(lock_name, timeout=timeout, blocking_timeout=wait_timeout)

    is_locked = False

    try:
        is_locked = await lock.acquire(blocking=True)
        if not is_locked:
            raise exceptions.ConflictError(
                f"Resource '{lock_name.replace('lock:', '').replace(':', '')}' "
                f"is currently locked by another user. "
                f"Please try again in a moment."
            )
        yield

    except RedisError as e:
        raise exceptions.ExternalServiceError(
            service="Redis", detail="Distributed lock system failure."
        ) from e

    finally:
        if is_locked:
            try:
                await lock.release()
            except RedisError as e:
                logger.error(f"Failed to release redis lock '{lock_name}': {e}")
