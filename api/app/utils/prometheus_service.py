"""
Utility functions to interact with Prometheus server.
"""

import asyncio
import os
from typing import List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv(".env/api.env")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL")


_client = httpx.AsyncClient(
    timeout=httpx.Timeout(5.0),
    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
)
DEFAULT_QUERIES = {
    "status": "up",
    "cpu_usage": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode='idle'}[5m])) * 100)",
    "memory_usage": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) "
    "/ node_memory_MemTotal_bytes * 100",
    "disk_usage": '100 - (node_filesystem_avail_bytes{fstype!="tmpfs", mountpoint!="/boot"} * 100) '
    '/ node_filesystem_size_bytes{fstype!="tmpfs", mountpoint!="/boot"}',
}


async def _request(
    url: str, params: dict, retries: int = 3, backoff_factor: float = 0.5
):
    """
    Make an HTTP GET request with retries and exponential backoff.
    :param url: Prometheus URL (/api/v1/query)
    :param params: Query parameters
    :param retries: Number of retries when request fails
    :param backoff_factor: Backoff factor for retries
    :return: Json response from Prometheus
    """
    for _ in range(retries):
        try:
            response = await _client.get(url, params=params)
            if 400 <= response.status_code < 500:
                response.raise_for_status()
            if response.status_code >= 500:
                response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            if 400 <= status_code < 500:
                raise
            await asyncio.sleep(backoff_factor)
        except (httpx.RequestError, asyncio.TimeoutError):
            await asyncio.sleep(backoff_factor)
    raise httpx.HTTPError(f"Failed to fetch data from {url} after {retries} attempts")


async def _format_metrics_to_readable(item: dict):
    """
    Format Prometheus metric item to a more readable format.
    :param item: Prometheus metric item
    :return: Formatted metric item
    """
    metric = item.get("metric", {}) or {}.copy()
    value = item.get("value", []) or []
    formatted_item = {
        "instance": metric.get("instance"),
        "job": metric.get("job"),
        "value": float(value[1]) if len(value) > 1 else None,
        "timestamp": float(value[0]) if len(value) > 0 else None,
    }
    return formatted_item


async def fetch_prometheus_metrics(
    metrics: Optional[List[str]], hosts: Optional[List[str]] = None
):
    """
    Fetch metrics from Prometheus server and filter by hosts if provided.
    :param metrics: List of metrics to fetch
    :param hosts: List of hosts to filter metrics (Optional)
    :return: Dictionary of fetched metrics
    """
    metrics = metrics or DEFAULT_QUERIES.keys()
    url = f"{PROMETHEUS_URL}/api/v1/query"

    results = {}
    for m in metrics:
        query = DEFAULT_QUERIES.get(m)
        if not query:
            metrics[m] = {"error": "Metric not found"}
            continue
        try:
            payload = await _request(url, params={"query": query})
            series = payload.get("data", {}).get("result", [])
            readable = await asyncio.gather(
                *[_format_metrics_to_readable(item) for item in series]
            )
            if hosts:
                readable = [item for item in readable if item.get("instance") in hosts]
            results[m] = readable
        except httpx.HTTPError as e:
            results[m] = {"error": str(e)}
    return results


async def close_prometheus_client():
    """
    Close the HTTP client session.
    """
    await _client.aclose()
