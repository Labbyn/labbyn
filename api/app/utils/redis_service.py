"""Redis service for caching using aioredis."""

import os
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from dotenv import load_dotenv
from fastapi import HTTPException, status
from redis import RedisError

load_dotenv(".env/api.env")
REDIS_URL = os.getenv("REDIS_URL")
COLLECT_TIMEOUT = int(os.getenv("COLLECT_TIMEOUT"))


# pylint: disable=too-few-public-methods
class RedisClientManager:
    """
    Singleton class to manage Redis Connection
    """

    def __init__(self):
        self.client = None

    async def get_client(self):
        """
        Initialize or return existing redis client
        :return: Existing redis client
        """
        if self.client is None:
            self.client = await aioredis.from_url(
                REDIS_URL, encoding="utf-8", decode_responses=True
            )
        return self.client


redis_manager = RedisClientManager()


async def get_redis_client():
    """
    Get a singleton Redis client instance.
    :return: aioredis Redis client
    """
    return await redis_manager.get_client()


async def set_cache(key: str, value: str):
    """
    Set a value in Redis cache with an expiration time.
    :param key: Cache key
    :param value: Cache value
    :param expire: Expiration time in seconds
    """
    redis_client = await get_redis_client()
    await redis_client.set(key, value, ex=COLLECT_TIMEOUT)


async def get_cache(key: str):
    """
    Get a value from Redis cache by key.
    :param key: Search for value by key
    :return: Value from redis cache
    """
    r = await get_redis_client()
    return await r.get(key)


@asynccontextmanager
async def acquire_lock(
    lock_name: str, timeout: int = COLLECT_TIMEOUT, wait_timeout: int = 5
):
    """
    Context manager for Redis distributed lock.
    Uses shared Redis client connection.
    :param lock_name: Unique key for the lock, eg. lock:machine:1
    :param timeout: Auto-release time in seconds
    :param wait_timeout: Waiting for lock before dropping
    :return: None
    """
    client = await get_redis_client()
    lock = client.lock(lock_name, timeout=timeout, blocking_timeout=wait_timeout)

    is_locked = False

    try:
        is_locked = await lock.acquire(blocking=True)
        if not is_locked:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Enitity is locked (being used by another user), wait a little.",
            )
        yield

    except RedisError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis service failed.",
        ) from e

    finally:
        if is_locked:
            try:
                await lock.release()
            except RedisError as e:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Redis service failed.",
                ) from e
