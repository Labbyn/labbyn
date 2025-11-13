"""Router for Prometheus metrics and WebSocket endpoint."""

import json
import asyncio
import os
from dotenv import load_dotenv
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from ..utils.prometheus_service import fetch_prometheus_metrics, DEFAULT_QUERIES
from ..utils.redis_service import get_cache, set_cache

load_dotenv(".env/api.env")
CACHE_KEY = os.getenv("PROMETEUS_CASHE_KEY")
HOST_STATUS_INTERVAL = int(os.getenv("HOST_STATUS_INTERVAL"))
OTHER_METRICS_INTERVAL = int(os.getenv("OTHER_METRICS_INTERVAL"))
WEBSOCKET_PUSH_INTERVAL = int(os.getenv("WEBSOCKET_PUSH_INTERVAL"))
PROMETEUS_CASHE_STATUS_KEY = "prometheus_metrics_cache"
PROMETEUS_CASHE_METRICS_KEY = "prometheus_other_metrics_cache"

router = APIRouter()


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
        await set_cache(PROMETEUS_CASHE_STATUS_KEY, json.dumps(status))
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
        await set_cache(PROMETEUS_CASHE_METRICS_KEY, json.dumps(metrics))
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
            status_data = await get_cache(PROMETEUS_CASHE_STATUS_KEY)
            metrics_data = await get_cache(PROMETEUS_CASHE_METRICS_KEY)
            payload = {
                "status": json.loads(status_data) if status_data else {},
                "metrics": json.loads(metrics_data) if metrics_data else {},
            }
            await ws.send_json(payload)
            await asyncio.sleep(WEBSOCKET_PUSH_INTERVAL)
    except WebSocketDisconnect:
        manager.disconnect()


@router.get("/prometheus/metrics")
async def get_prometheus_metrics():
    """
    Fetch  Metrics for all hosts directly from Prometheus (bypasses cache).
    :return: Metrics data for all hosts
    """
    metrics_data = await fetch_prometheus_metrics(
        metrics=list(DEFAULT_QUERIES.keys()), hosts=None
    )
    return metrics_data


@router.get("/prometheus/hosts")
async def get_prometheus_hosts():
    """
    Fetch all unique host instances from Prometheus.
    :return: List of unique hosts
    """
    payload = await fetch_prometheus_metrics(metrics=["status"], hosts=None)
    all_hosts = set()
    for item in payload.get("status", []):
        if "instance" in item:
            all_hosts.add(item["instance"])
    return {"hosts": list(all_hosts)}


@router.get("/prometheus/selected_hosts/metrics")
async def get_selected_hosts_prometheus_metric(
    hosts: str = Query(None, description="Comma separated hosts")
):
    """
    Fetch metrics for selected hosts directly from Prometheus (bypasses cache).
    :param hosts: List of hosts as comma separated string
    :return: Metrics data for selected hosts
    """
    host_list = hosts.split(",") if hosts else None
    metrics_data = await fetch_prometheus_metrics(
        list(DEFAULT_QUERIES.keys()), hosts=host_list
    )
    return metrics_data
