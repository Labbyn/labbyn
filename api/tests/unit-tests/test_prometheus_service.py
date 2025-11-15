"""Unit tests for Prometheus service utilities."""
from unittest import mock

import httpx
import pytest
from app.utils.prometheus_service import fetch_prometheus_metrics

@pytest.mark.unit
@pytest.mark.asyncio
async def test_fetch_prometheus_metrics_success():
    """Test fetching Prometheus metrics successfully."""
    with mock.patch("app.utils.prometheus_service._request") as request:
        request.return_value = {"data": {"result": []}}
        result = await fetch_prometheus_metrics(metrics=["status"], hosts=None)
        assert "status" in result
        assert result["status"] == []

@pytest.mark.unit
@pytest.mark.asyncio
async def test_fetch_prometheus_metrics_failure():
    """Test fetching Prometheus metrics with a failure."""
    with mock.patch("app.utils.prometheus_service._request") as request:
        request.side_effect = httpx.HTTPError("Request failed")
        result = await fetch_prometheus_metrics(metrics=["status"], hosts=None)
        assert "status" in result
        assert "error" in result["status"]
        assert "Request failed" in result["status"]["error"]

@pytest.mark.unit
@pytest.mark.asyncio
async def test_fetch_prometheus_metrics_with_filtered_instances():
    """Test fetching Prometheus metrics filtered by instances."""
    with mock.patch("app.utils.prometheus_service._request") as request:
        request.return_value = {
            "data": {
                "result": [
                    {
                        "metric": {"instance": "host1", "job": "job1"},
                        "value": [1625247600, "1"],
                    },
                    {
                        "metric": {"instance": "host2", "job": "job1"},
                        "value": [1625247600, "0"],
                    },
                ]
            }
        }
        result = await fetch_prometheus_metrics(metrics=["status"], hosts=["host1"])
        assert "status" in result
        assert len(result["status"]) == 1
        assert result["status"][0]["instance"] == "host1"
        assert result["status"][0]["value"] == 1.0
