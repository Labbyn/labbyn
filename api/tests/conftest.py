"""Pytest configuration file for setting up test fixtures."""
import os
import sys
import uuid
from unittest import mock

import pytest
from app.main import app
from fastapi.testclient import TestClient
# Encountered issues with docker - added /code path to PYTHON PATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.database import SessionLocal


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
    Tworzy nową sesję do bazy danych na potrzeby testu.
    Po zakończeniu testu zamyka sesję.
    """
    session = SessionLocal()
    session.info['user_id'] = None
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="function")
def unique_category_name():
    """Genearate random category name to avoid unique problems"""
    return f"SmokeTest-GPU-{uuid.uuid4().hex[:8]}"
