"""Router for Prometheus metrics and WebSocket endpoint."""

import json
import asyncio
import os
from dotenv import load_dotenv
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from ..utils.prometheus_service import fetch_prometheus_metrics, DEFAULT_QUERIES
from ..utils.redis_service import get_cache, set_cache

load_dotenv(".env/api.env")
HOST_STATUS_INTERVAL = int(os.getenv("HOST_STATUS_INTERVAL"))
OTHER_METRICS_INTERVAL = int(os.getenv("OTHER_METRICS_INTERVAL"))
WEBSOCKET_PUSH_INTERVAL = int(os.getenv("WEBSOCKET_PUSH_INTERVAL"))
PROMETEUS_CACHE_STATUS_KEY = "prometheus_metrics_cache"
PROMETEUS_CACHE_METRICS_KEY = "prometheus_other_metrics_cache"

router = APIRouter()


def _extract_host_from_instance(instance: str):
    """
    Extract hostname/IP from Prometheus instance string.
    :param instance: Prometheus instance string (e.g., "
    :return: Hostname/IP part of the instance
    """
    if not instance:
        return instance
    return instance.rsplit(":", maxsplit=1)[0] if ":" in instance else instance


# pylint: disable=too-few-public-methods
class WSConnectionManager:
    """
    Create global websocket connection.
    """

    def __init__(self):
        self.websocket = None

    def disconnect(self):
        """Disconnect the websocket connection."""
        self.websocket = None


manager = WSConnectionManager()


async def status_worker():
    """
    Periodically fetch host status metrics and store them in cache.
    :return: None
    """
    while True:
        status = await fetch_prometheus_metrics(metrics=["status"], hosts=None)
        await set_cache(PROMETEUS_CACHE_STATUS_KEY, json.dumps(status))
        await asyncio.sleep(HOST_STATUS_INTERVAL)


async def metrics_worker():
    """
    Periodically fetch CPU, RAM, Disk usage metrics and store them in cache.
    :return: None
    """
    while True:
        metrics = await fetch_prometheus_metrics(
            metrics=["cpu_usage", "memory_usage", "disk_usage"], hosts=None
        )
        await set_cache(PROMETEUS_CACHE_METRICS_KEY, json.dumps(metrics))
        await asyncio.sleep(OTHER_METRICS_INTERVAL)


@router.websocket("/ws/metrics")
async def websocket_endpoint(ws: WebSocket):
    """
    WebSocket endpoint to push metrics data to front-end.
    Websocket will send cached metrics data at regular intervals,
    to reduce load on API server and Prometheus.
    :param ws: WebSocket connection
    :return: None
    """
    manager.websocket = ws
    await ws.accept()
    try:
        while True:
            status_data = await get_cache(PROMETEUS_CACHE_STATUS_KEY)
            metrics_data = await get_cache(PROMETEUS_CACHE_METRICS_KEY)
            payload = {
                "status": json.loads(status_data) if status_data else {},
                "metrics": json.loads(metrics_data) if metrics_data else {},
            }
            await ws.send_json(payload)
            await asyncio.sleep(WEBSOCKET_PUSH_INTERVAL)
    except WebSocketDisconnect:
        manager.disconnect()


@router.get("/prometheus/instances")
async def get_prometheus_instances():
    """
    Fetch all unique host instances [HOST::PORT] from Prometheus.
    :return: List of unique hosts
    """
    payload = await fetch_prometheus_metrics(metrics=["status"], hosts=None)
    all_instances = set()
    for item in payload.get("status", []):
        if "instance" in item:
            all_instances.add(item["instance"])
    return {"isnstances": list(all_instances)}


@router.get("/prometheus/hosts")
async def get_prometheus_hosts():
    """
    Fetch all unique hostnames/IPs [ex.192.168.1.2, server1-example.com] from Prometheus.
    :return: List of unique hostnames/IPs
    """
    payload = await fetch_prometheus_metrics(metrics=["status"], hosts=None)
    all_hosts = set()
    for item in payload.get("status", []):
        if "instance" in item:
            host = _extract_host_from_instance(item["instance"])
            all_hosts.add(host)
    return {"hosts": list(all_hosts)}


@router.get("/prometheus/metrics")
async def get_prometheus_metrics(
    instances: str = Query(None, description="Comma separated instances")
):
    """
    Fetch metrics for selected instances directly from Prometheus (bypasses cache).
    :param hosts: List of instances as comma separated string
    :return: Metrics data for selected instances, or all if none specified
    """
    instances_list = instances.split(",") if instances else None
    metrics_data = await fetch_prometheus_metrics(
        list(DEFAULT_QUERIES.keys()), hosts=instances_list
    )
    return metrics_data
