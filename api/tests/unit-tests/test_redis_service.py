"""Unit tests for Redis service utilities."""

from unittest import mock

import pytest
from app.utils.redis_service import get_cache, get_redis_client, set_cache


@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_redis_client_singleton():
    """Test that get_redis_client returns a singleton instance."""
    fake_instance = mock.AsyncMock()
    with mock.patch(
        "app.utils.redis_service.aioredis.from_url",
        new=mock.AsyncMock(return_value=fake_instance),
    ):
        client1 = await get_redis_client()
        client2 = await get_redis_client()
    assert client1 is client2


@pytest.mark.unit
@pytest.mark.asyncio
async def test_set_cache(redis_client_mock):
    """Test setting a value in Redis cache."""
    key = "test_key"
    value = "test_value"
    await set_cache(key, value)
    redis_client_mock.set.assert_awaited_once_with(key, value, ex=mock.ANY)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_cache(redis_client_mock):
    """Test getting a value from Redis cache."""
    key = "test_key"
    expected_value = "test_value"
    redis_client_mock.get.return_value = expected_value
    value = await get_cache(key)
    redis_client_mock.get.assert_awaited_once_with(key)
    assert value == expected_value
