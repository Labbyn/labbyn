"""Pytest configuration file for setting up test fixtures."""
import asyncio
import uuid
from unittest import mock

import pytest
import redis.asyncio as redis_asyncio
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.utils import redis_service
from app.utils.redis_service import REDIS_URL


@pytest.fixture(scope="module")
def test_client():
    """
    Pytest fixture to create a TestClient for the FastAPI app.
    :return: TestClient instance
    """
    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="module")
def redis_client_mock():
    """
    Pytest fixture to mock Redis client for testing.
    :return: Mocked Redis client
    """
    with mock.patch("app.utils.redis_service.get_redis_client") as mock_redis:
        mock_instance = mock.AsyncMock()
        mock_redis.return_value = mock_instance
        yield mock_instance


@pytest.fixture(scope="function")
def db_session():
    """
    Create new database session.
    After test finish, close it.
    """
    session = SessionLocal()
    session.info["user_id"] = None
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def unique_category_name():
    """Genearate random category name to avoid unique problems"""
    return f"SmokeTest-GPU-{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="function")
def refresh_redis_client(monkeypatch):
    """
    Refresh redis client connection (for CI tests)
    :param monkeypatch: Monkey patching fixture
    :return: New redis client connection
    """
    loop = None
    new_redis = redis_asyncio.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    monkeypatch.setattr(redis_service.redis_manager, "client", new_redis)
    yield
    try:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            loop.create_task(new_redis.aclose())
        else:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(new_redis.aclose())
            loop.close()
    #pylint: disable=broad-exception-caught
    except Exception:
        # If we catch any exception that means redis loop is already deactived.
        pass
