import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def test_client():
    """
    Pytest fixture to create a TestClient for the FastAPI app.
    :return: TestClient instance
    """
    with TestClient(app) as client:
        yield client
