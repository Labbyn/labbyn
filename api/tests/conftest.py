"""Pytest configuration file for setting up test fixtures."""

import uuid
from unittest import mock
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.utils import redis_service
from app.utils.redis_service import REDIS_URL
from app.utils.redis_service import redis_manager


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
async def refresh_redis_client(monkeypatch):
    """
    Refresh redis client connection (for CI tests)
     :param monkeypatch: Monkey patching fixture
     :return: New redis client connection
    """
    redis_manager.client = None
    redis_manager._loop = None

    yield redis_manager
    await redis_manager.close()


@pytest.fixture(scope="function")
def mock_ansible_success(monkeypatch):
    """
    Mock ansible runner to always return success.
    :param monkeypatch: Monkey patching fixture
    :return: Ansible runner mock
    """
    mock_run = MagicMock()
    mock_result = MagicMock()
    mock_result.rc = 0
    mock_result.status = "successful"
    mock_run.return_value = mock_result

    monkeypatch.setattr("app.utils.ansible_service.ansible_runner.run", mock_run)
    return mock_run
