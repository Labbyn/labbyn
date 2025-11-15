import pytest
import asyncio
from app.main import app
from app.utils.redis_service import set_cache

@pytest.mark.smoke
@pytest.mark.asyncio
async def test_prometheus_instances_endpoint(test_client):
    """Smoke test for /prometheus/instances endpoint."""
    response = test_client.get("/prometheus/instances")
    assert response.status_code == 200
    data = response.json()
    assert "instances" in data
    assert isinstance(data["instances"], list)

@pytest.mark.smoke
@pytest.mark.asyncio
async def test_prometheus_hosts_endpoint(test_client):
    """Smoke test for /prometheus/hosts endpoint."""
    response = test_client.get("/prometheus/hosts")
    assert response.status_code == 200
    data = response.json()
    assert "hosts" in data
    assert isinstance(data["hosts"], list)

@pytest.mark.smoke
@pytest.mark.asyncio
async def test_prometheus_metrics_endpoint(test_client):
    """Smoke test for /prometheus/metrics endpoint."""
    response = test_client.get("/prometheus/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "cpu_usage" in data
    assert "memory_usage" in data
    assert "disk_usage" in data
    assert isinstance(data["status"], list)
    assert isinstance(data["cpu_usage"], list)
    assert isinstance(data["memory_usage"], list)
    assert isinstance(data["disk_usage"], list)

@pytest.mark.smoke
def test_prometheus_websocket_endpoint(test_client):
    """Smoke test for /ws/metrics WebSocket endpoint."""
    with test_client.websocket_connect("/ws/metrics") as websocket:
        message = websocket.receive_json()
        assert "status" in message
        assert "metrics" in message
        assert isinstance(message["status"], dict)
        assert isinstance(message["metrics"], dict)

