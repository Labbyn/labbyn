"""Pytest configuration file for setting up test fixtures."""

from unittest import mock

import pytest
from app.main import app
from fastapi.testclient import TestClient


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
