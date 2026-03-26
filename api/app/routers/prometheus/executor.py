import asyncio
import json
import os
from typing import Any, Dict, List

import aiofiles
import httpx
from dotenv import load_dotenv

from app.core import exceptions
from app.utils import redis_service

load_dotenv(".env/api.env")


class PrometheusExecutor:
    """Handles direct communication with the Prometheus API and the targets JSON file."""

    URL = os.getenv("PROMETHEUS_URL")
    TARGETS_PATH = os.getenv("PROMETHEUS_TARGETS_PATH")

    STATUS_INTERVAL = int(os.getenv("HOST_STATUS_INTERVAL", 30))
    METRICS_INTERVAL = int(os.getenv("OTHER_METRICS_INTERVAL", 60))
    PUSH_INTERVAL = int(os.getenv("WEBSOCKET_PUSH_INTERVAL", 5))
    CACHE_STATUS_KEY = "prometheus_metrics_cache"
    CACHE_METRICS_KEY = "prometheus_other_metrics_cache"

    QUERIES = {
        "status": "up",
        "cpu_usage": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode='idle'}[5m])) * 100)",
        "memory_usage": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
        "disk_usage": '100 - (node_filesystem_avail_bytes{fstype!="tmpfs", mountpoint!="/boot"} * 100) / node_filesystem_size_bytes{fstype!="tmpfs", mountpoint!="/boot"}',
    }

    _targets_lock = asyncio.Lock()

    @classmethod
    async def _request(cls, url: str, params: dict, retries: int = 3) -> Dict[str, Any]:
        """Perform an asynchronous HTTP GET request with exponential backoff.

        :param url: The full destination URL (e.g., Prometheus query endpoint).
        :param params: A dictionary of query parameters.
        :param retries: Number of attempts before raising an error.
        :return: Parsed JSON response from the server.
        :raises exceptions.ExternalServiceError: If the service is unreachable or returns an error.
        """
        for _ in range(retries):
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    return response.json()
            except (httpx.HTTPError, asyncio.TimeoutError):
                await asyncio.sleep(0.5)
        raise exceptions.ExternalServiceError(
            service="Prometheus",
            detail=f"Failed to connect to Prometheus after {retries} attempts.",
        )

    @classmethod
    async def fetch_prometheus_metrics(cls, metrics: List[str]) -> Dict[str, Any]:
        """Fetch multiple metrics from Prometheus and format them into a unified structure.

        Iterates over the requested metric keys, executes the corresponding PromQL
        queries defined in cls.QUERIES, and flattens the result for easier processing.

        :param metrics: A list of metric keys (e.g., ['cpu_usage', 'status']).
        :return: A dictionary where keys are metric names and values are lists of formatted data points.
        """
        url = f"{cls.URL}/api/v1/query"
        results = {}
        for m in metrics:
            query = cls.QUERIES.get(m)
            if not query:
                continue
            try:
                payload = await cls._request(url, params={"query": query})
                series = payload.get("data", {}).get("result", [])
                formatted = []
                for item in series:
                    metric_info = item.get("metric", {})
                    val_point = item.get("value", [])
                    formatted.append(
                        {
                            "instance": metric_info.get("instance"),
                            "job": metric_info.get("job"),
                            "mountpoint": metric_info.get("mountpoint"),
                            "value": (
                                float(val_point[1]) if len(val_point) > 1 else None
                            ),
                            "timestamp": (
                                float(val_point[0]) if len(val_point) > 0 else None
                            ),
                        }
                    )
                results[m] = formatted
            except Exception as e:
                results[m] = {"error": str(e)}
        return results

    @classmethod
    async def save_targets(cls, targets: List[dict]) -> None:
        """Overwrite the Prometheus targets JSON file with new data.

        :param targets: A list of target dictionaries (e.g., [{'targets': [...], 'labels': {...}}]).
        :raises exceptions.TargetSaveError: If the file path is missing or writing fails.
        :raises exceptions.ValidationError: If the data cannot be serialized or written.
        """
        if not cls.TARGETS_PATH:
            raise exceptions.TargetSaveError(
                "PROMETHEUS_TARGETS_PATH is not defined in environment."
            )
        try:
            async with aiofiles.open(cls.TARGETS_PATH, mode="w", encoding="utf-8") as f:
                await f.write(json.dumps(targets, indent=2))
        except (OSError, TypeError) as e:
            raise exceptions.ValidationError(
                f"Failed to write Prometheus targets file: {str(e)}"
            )

    @classmethod
    async def load_targets(cls) -> List[dict]:
        """Load and parse the Prometheus targets JSON file.

        :return: A list of targets. Returns an empty list if the file is missing or corrupted.
        """
        if not cls.TARGETS_PATH:
            return []
        try:
            async with aiofiles.open(cls.TARGETS_PATH, mode="r", encoding="utf-8") as f:
                content = await f.read()
                return json.loads(content)
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            return []

    @classmethod
    async def status_worker(cls):
        """Background worker for host status."""
        while True:
            try:
                data = await cls.fetch_prometheus_data(metrics=["status"])
                await redis_service.set_cache(cls.CACHE_STATUS_KEY, json.dumps(data))
            except Exception:
                pass
            await asyncio.sleep(cls.STATUS_INTERVAL)

    @classmethod
    async def metrics_worker(cls):
        """Background worker for CPU/RAM/Disk metrics."""
        while True:
            try:
                data = await cls.fetch_prometheus_data(
                    metrics=["cpu_usage", "memory_usage", "disk_usage"]
                )
                await redis_service.set_cache(cls.CACHE_METRICS_KEY, json.dumps(data))
            except Exception:
                pass
            await asyncio.sleep(cls.METRICS_INTERVAL)


status_worker = PrometheusExecutor.status_worker
metrics_worker = PrometheusExecutor.metrics_worker
