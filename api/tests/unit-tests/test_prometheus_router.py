import pytest
from unittest import mock

@pytest.mark.unit
def test_get_prometheus_instances(test_client):
    """Test fetching unique instances from Prometheus."""
    with mock.patch("app.routers.prometheus_router.fetch_prometheus_metrics") as fetch_metrics:
        fetch_metrics.return_value = {
            "status": [
                {"instance": "host1:9090"},
                {"instance": "host2:9090"},
            ]
        }
        response = test_client.get("/prometheus/instances")
        assert response.status_code == 200
        data = response.json()
        assert "instances" in data
        assert set(data["instances"]) == {"host1:9090", "host2:9090"}

@pytest.mark.unit
def test_get_prometheus_hosts(test_client):
    """Test fetching unique hosts from Prometheus instances."""
    with mock.patch("app.routers.prometheus_router.fetch_prometheus_metrics") as fetch_metrics:
        fetch_metrics.return_value = {
            "status": [
                {"instance": "host1:9090"},
                {"instance": "host2:9090"},
            ]
        }
        response = test_client.get("/prometheus/hosts")
        assert response.status_code == 200
        data = response.json()
        assert "hosts" in data
        assert set(data["hosts"]) == {"host1", "host2"}

@pytest.mark.unit
def test_get_prometheus_metrics_all_instances(test_client):
    """Test fetching all Prometheus metrics without filtering by hosts."""
    with mock.patch("app.routers.prometheus_router.fetch_prometheus_metrics") as fetch_metrics:
        fetch_metrics.return_value = {
            "status": [
                {"instance": "host1:9090", "value": 1.0},
                {"instance": "host2:9090", "value": 0.0},
            ]
        }
        response = test_client.get("/prometheus/metrics", params={"metrics": "status"})
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert len(data["status"]) == 2

@pytest.mark.unit
def test_get_prometheus_metrics_filtered_hosts(test_client):
    """Test fetching Prometheus metrics filtered by hosts."""
    with mock.patch("app.routers.prometheus_router.fetch_prometheus_metrics") as fetch_metrics:
        fetch_metrics.return_value = {
            "status": [
                {"instance": "host1:9090", "value": 1.0},
                {"instance": "host2:9090", "value": 0.0},
            ]
        }
        response = test_client.get("/prometheus/metrics", params={"metrics": "status", "hosts": "host1"})
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        filtered = [item for item in data["status"] if item["instance"] == "host1:9090"]
        assert len(filtered) == 1
        assert filtered[0]["instance"] == "host1:9090"

