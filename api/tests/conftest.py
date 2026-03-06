"""Pytest configuration file for setting up test fixtures."""

import uuid
import asyncio
from unittest import mock
from unittest.mock import MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import AsyncSessionLocal
from app.main import app
from app.utils.redis_service import redis_manager


@pytest.fixture(scope="session")
def event_loop():
    """
    Create an instance of the default event loop for each test module.
    :return: Event loop instance
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_client():
    """
    Pytest fixture to create an AsyncClient for the FastAPI app.
    :return: AsyncClient instance
    """
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
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
async def db_session():
    """
    Create new database session.
    After test finish, close it.
    """
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()


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


@pytest.fixture(scope="function")
async def service_header(test_client):
    """
    Generate service authorization header for tests.
    :return: Authorization header with service token
    """
    res = await test_client.post(
        "/auth/login", data={"username": "Service", "password": "Service"}
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
async def alpha_admin_header(test_client, service_header):
    """
    Generate alpha admin authorization header for tests.
    :return: Authorization header with alpha admin token
    """
    admin_login = f"alpha_{uuid.uuid4().hex[:4]}"
    team_res = await test_client.post(
        "/db/teams/",
        json={"name": "Team Alpha", "team_admin_id": 1},
        headers=service_header,
    )
    team_id = team_res.json()["id"]

    user_res = await test_client.post(
        "/db/users/",
        json={
            "login": admin_login,
            "email": f"{admin_login}@lab.pl",
            "user_type": "group_admin",
            "team_id": team_id,
            "name": "Adam",
            "surname": "Alpha",
        },
        headers=service_header,
    )

    user_data = user_res.json()
    login_res = await test_client.post(
        "/auth/login",
        data={"username": admin_login, "password": user_data["generated_password"]},
    )

    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "team_id": team_id}
