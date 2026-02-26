"""Smoke tests for Prometheus-related endpoints."""

import pytest
from app.main import app
from app.db.models import User, UserType


pytestmark = [pytest.mark.smoke, pytest.mark.prometheus]


def test_prometheus_instances_endpoint(test_client, service_header_sync):
    """Smoke test for /prometheus/instances endpoint."""
    response = test_client.get("/prometheus/instances", headers=service_header_sync)
    assert response.status_code == 200
    assert "instances" in response.json()


def test_prometheus_hosts_endpoint(test_client, service_header_sync):
    """Smoke test for /prometheus/hosts endpoint."""
    response = test_client.get("/prometheus/hosts", headers=service_header_sync)
    assert response.status_code == 200
    assert "hosts" in response.json()


async def test_prometheus_metrics_endpoint(test_client, service_header_sync):
    """Smoke test for /prometheus/metrics endpoint."""
    response = test_client.get("/prometheus/metrics", headers=service_header_sync)
    assert response.status_code == 200
    data = response.json()
    for key in ["status", "cpu_usage", "memory_usage", "disk_usage"]:
        assert key in data


@pytest.mark.xfail
async def test_prometheus_websocket_endpoint(test_client, refresh_redis_client):
    """
    Smoke test for /ws/metrics WebSocket endpoint.
    Test disabled due to async testing with WebSocketClient causing issues in CI/CD pipeline.
    Please test manually if needed.
    """
    with test_client.websocket_connect("/ws/metrics") as websocket:
        message = websocket.receive_json()
        expected_keys = ["statuses", "metrics"]
        for key in expected_keys:
            assert key in message
            assert isinstance(message[key], (dict, list))


def test_prometheus_target_endpoint_connection(test_client, service_header_sync):
    """Smoke test for /prometheus/target endpoint."""
    payload = {"instance": "dummy:9100", "labels": {"env": "ci-test"}}
    response = test_client.post(
        "/prometheus/target", json=payload, headers=service_header_sync
    )
    assert response.status_code in (200, 400, 422)
