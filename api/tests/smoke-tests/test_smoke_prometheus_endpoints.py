"""Smoke tests for Prometheus-related endpoints."""

import pytest

pytestmark = [pytest.mark.smoke, pytest.mark.prometheus]


@pytest.mark.asyncio
async def test_prometheus_instances_endpoint(test_client, service_header):
    """Smoke test for /prometheus/instances endpoint."""
    response = test_client.get("/prometheus/instances", headers=service_header)
    assert response.status_code == 200
    data = response.json()
    assert "instances" in data
    assert isinstance(data["instances"], list)


@pytest.mark.asyncio
async def test_prometheus_hosts_endpoint(test_client, service_header):
    """Smoke test for /prometheus/hosts endpoint."""
    response = test_client.get("/prometheus/hosts", headers=service_header)
    assert response.status_code == 200
    data = response.json()
    assert "hosts" in data
    assert isinstance(data["hosts"], list)


@pytest.mark.asyncio
async def test_prometheus_metrics_endpoint(test_client, service_header):
    """Smoke test for /prometheus/metrics endpoint."""
    response = test_client.get("/prometheus/metrics", headers=service_header)
    assert response.status_code == 200
    data = response.json()
    excepted_metrics = ["status", "cpu_usage", "memory_usage", "disk_usage"]
    for key in excepted_metrics:
        assert key in data
        assert isinstance(data[key], list)


@pytest.mark.asyncio
async def test_prometheus_websocket_endpoint(test_client, service_header, refresh_redis_client):
    """Smoke test for /ws/metrics WebSocket endpoint."""
    token = service_header["Authorization"].split(" ")[1]
    with test_client.websocket_connect(f"/ws/metrics?token={token}") as websocket:
        message = websocket.receive_json()
        expected_keys = ["statuses", "metrics"]
        for key in expected_keys:
            assert key in message
            assert isinstance(message[key], (dict, list))


def test_prometheus_target_endpoint_connection(test_client):
    """Smoke test for /prometheus/target endpoint."""
    payload = {"instance": "dummy:9100", "labels": {"env": "ci-test"}}

    response = test_client.post("/prometheus/target", json=payload)
    data = response.json()
    assert response.status_code in (200, 400, 422)
    assert "message" in data or "error" in data
