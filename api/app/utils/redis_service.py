"""Redis service for caching using aioredis."""

import os

import redis.asyncio as aioredis
from dotenv import load_dotenv

load_dotenv(".env/api.env")
REDIS_URL = os.getenv("REDIS_URL")
COLLECT_TIMEOUT = int(os.getenv("COLLECT_TIMEOUT"))

async def get_redis_client():
    """
    Get a singleton Redis client instance.
    :return: aioredis Redis client
    """
    global _redis_client
    if "_redis_client" not in globals():
        _redis_client = await aioredis.from_url(
            REDIS_URL, encoding="utf-8", decode_responses=True
        )
    return _redis_client


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
    :param key:
    :return:
    """
    r = await get_redis_client()
    return await r.get(key)

