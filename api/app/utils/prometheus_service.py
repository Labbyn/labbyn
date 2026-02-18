"""
Utility functions to interact with Prometheus server.
"""

import asyncio
import os
from typing import List, Optional
import json
from threading import Lock
import httpx
from dotenv import load_dotenv

load_dotenv(".env/api.env")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL")
PROMETHEUS_TARGETS_PATH = os.getenv("PROMETHEUS_TARGETS_PATH")

DEFAULT_QUERIES = {
    "status": "up",
    "cpu_usage": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode='idle'}[5m])) * 100)",
    "memory_usage": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) "
    "/ node_memory_MemTotal_bytes * 100",
    "disk_usage": '100 - (node_filesystem_avail_bytes{fstype!="tmpfs", mountpoint!="/boot"} * 100) '
    '/ node_filesystem_size_bytes{fstype!="tmpfs", mountpoint!="/boot"}',
}

# Global lock for file operations
_targets_lock = Lock()


class TargetSaveError(Exception):
    """Custom exception for target saving errors."""


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
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, params=params)
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
        "mountpoint": metric.get("mountpoint"),
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


def load_targets_file():
    """
    Load Prometheus targets from the targets file.
    :return: List of target dictionaries or empty list if file not found or invalid
    """

    if not PROMETHEUS_TARGETS_PATH:
        return []
    try:
        with open(PROMETHEUS_TARGETS_PATH, "r", encoding="utf-8") as file:
            targets = json.load(file)
        return targets
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return []


def save_targets_file(targets: List[dict]):
    """
    Save Prometheus targets to the targets file.
    :param targets: List of target dictionaries
    """
    if not PROMETHEUS_TARGETS_PATH:
        raise TargetSaveError("PROMETHEUS_TARGETS_PATH is not set.")
    try:
        with open(PROMETHEUS_TARGETS_PATH, "w", encoding="utf-8") as file:
            json.dump(targets, file, indent=2)
    except (OSError, TypeError) as e:
        raise TargetSaveError(f"Failed to save targets file: {e}") from e


def add_prometheus_target(instance: str, labels: dict):
    """
    Add a new target to the Prometheus targets file.
    :param new_target: Target dictionary to add
    """
    entry = {"targets": [instance], "labels": labels}
    with _targets_lock:
        targets = load_targets_file()
        targets.append(entry)
    try:
        save_targets_file(targets)
    except TargetSaveError as e:
        raise TargetSaveError(f"Failed to add target: {e}") from e
    return entry
