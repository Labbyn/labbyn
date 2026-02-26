"""Router for Prometheus metrics and WebSocket endpoint."""

import json
import asyncio
import os
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from pydantic import BaseModel
from urllib.parse import unquote
from app.database import get_db
from starlette import status

from ..auth.auth_config import auth_backend
from ..db.models import Machines
from app.auth.auth_config import auth_backend, fastapi_users, get_database_strategy
from ..utils.prometheus_service import (
    fetch_prometheus_metrics,
    DEFAULT_QUERIES,
    add_prometheus_target,
    TargetSaveError,
)
from app.auth.dependencies import RequestContext
from app.auth.manager import get_user_manager
from ..utils.redis_service import get_cache, set_cache
from sqlalchemy.orm import Session

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


class PrometheusTarget(BaseModel):
    """
    Pydantic model for Prometheus target.
    """

    instance: str
    labels: dict


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
async def websocket_endpoint(
    ws: WebSocket,
    instance: str = Query(None, description="Filter by instance"),
    db: Session = Depends(get_db),
    user_manager=Depends(get_user_manager),
    strategy=Depends(get_database_strategy),
):
    """
    WebSocket endpoint to push metrics data to front-end.
    Websocket will send cached metrics data at regular intervals,
    to reduce load on API server and Prometheus.
    :param ws: WebSocket connection
    :param instance: Optional instance filter
    :return: None
    """
    manager.websocket = ws
    await ws.accept()

    token = ws.query_params.get("token")
    if not token:
        await ws.send_json({"error": "Authentication token is required."})
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = await strategy.read_token(token, user_manager)

    try:
        ctx = await RequestContext.for_websocket(user)
        query = db.query(Machines.name)
        query = ctx.team_filter(query, Machines)
        allowed_hosts = {row[0] for row in query.all()}
        while True:
            status_data = await get_cache(PROMETEUS_CACHE_STATUS_KEY)
            metrics_data = await get_cache(PROMETEUS_CACHE_METRICS_KEY)

            status_parsed = json.loads(status_data) if status_data else {}
            metrics_parsed = json.loads(metrics_data) if metrics_data else {}
            if instance:
                target = unquote(instance)
                host_only = _extract_host_from_instance(target)
                if not ctx.is_admin and host_only not in allowed_hosts:
                    await ws.send_json(
                        {"error": "Access denied for the requested instance."}
                    )
                    await asyncio.sleep(WEBSOCKET_PUSH_INTERVAL)
                    continue

                statuses = status_parsed.get("status", [])
                is_online = any(
                    s["instance"] == target and s["value"] == 1.0 for s in statuses
                )
                payload = {
                    "instance": target,
                    "online": is_online,
                    "cpu": next(
                        (
                            m["value"]
                            for m in metrics_parsed.get("cpu_usage", [])
                            if m["instance"] == target
                        ),
                        None,
                    ),
                    "memory": next(
                        (
                            m["value"]
                            for m in metrics_parsed.get("memory_usage", [])
                            if m["instance"] == target
                        ),
                        None,
                    ),
                    "disks": [
                        {"value": round(m["value"], 2), "timestamp": m["timestamp"]}
                        for m in metrics_parsed.get("disk_usage", [])
                        if m["instance"] == target
                    ],
                }
                await ws.send_json(payload)
            else:
                filtered_payload = {
                    "statuses": [
                        s
                        for s in status_parsed.get("status", [])
                        if ctx.is_admin
                        or _extract_host_from_instance(s["instance"]) in allowed_hosts
                    ],
                    "metrics": {
                        metric: [
                            m
                            for m in values
                            if ctx.is_admin
                            or _extract_host_from_instance(m["instance"])
                            in allowed_hosts
                        ]
                        for metric, values in metrics_parsed.items()
                    },
                }
                await ws.send_json(filtered_payload)
            await asyncio.sleep(WEBSOCKET_PUSH_INTERVAL)

    except WebSocketDisconnect:
        manager.disconnect()


@router.get("/prometheus/instances")
async def get_prometheus_instances(
    db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch all unique host instances [HOST::PORT] from Prometheus.
    :return: List of unique hosts
    """
    ctx.require_user()
    payload = await fetch_prometheus_metrics(metrics=["status"], hosts=None)

    query = db.query(Machines.name)
    query = ctx.team_filter(query, Machines)
    allowed_hosts = {row[0] for row in query.all()}

    all_instances = set()
    for item in payload.get("status", []):
        if "instance" in item:
            instance = item["instance"]
            host_only = _extract_host_from_instance(item["instance"])
            if ctx.is_admin or host_only in allowed_hosts:
                all_instances.add(instance)
    return {"instances": list(all_instances)}


@router.get("/prometheus/hosts")
async def get_prometheus_hosts(
    db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch all unique hostnames/IPs [ex.192.168.1.2, server1-example.com] from Prometheus.
    :return: List of unique hostnames/IPs
    """
    ctx.require_user()

    payload = await fetch_prometheus_metrics(metrics=["status"], hosts=None)
    query = db.query(Machines.name)
    query = ctx.team_filter(query, Machines)
    allowed_hosts = {row[0] for row in query.all()}

    all_hosts = set()
    for item in payload.get("status", []):
        if "instance" in item:
            host = _extract_host_from_instance(item["instance"])
            if ctx.is_admin or host in allowed_hosts:
                all_hosts.add(host)
    return {"hosts": list(all_hosts)}


@router.get("/prometheus/metrics")
async def get_prometheus_all_metrics(
    instances: Optional[List[str]] = Query(
        None,
        description="List of instances or comma-separated string (e.g. host1:9100,host2:9100)",
    ),
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Fetch metrics for selected instances directly from Prometheus (bypasses cache).
    :param instances: List of instances as comma separated string
    :return: Metrics data for selected instances, or all if none specified
    """
    ctx.require_user()

    query = db.query(Machines.name)
    query = ctx.team_filter(query, Machines)
    allowed_hosts = {row[0] for row in query.all()}

    if not instances:
        if ctx.is_admin:
            return await fetch_prometheus_metrics(
                list(DEFAULT_QUERIES.keys()), hosts=None
            )
        return await fetch_prometheus_metrics(
            list(DEFAULT_QUERIES.keys()), hosts=list(allowed_hosts)
        )

    processed_instances = []
    for item in instances:
        if "," in item:
            processed_instances.extend([unquote(i.strip()) for i in item.split(",")])
        else:
            processed_instances.append(unquote(item.strip()))

    final_instances = []
    for item in processed_instances:
        host_only = _extract_host_from_instance(item)
        if ctx.is_admin or host_only in allowed_hosts:
            final_instances.append(item)

    if not final_instances and not ctx.is_admin:
        return {metric: [] for metric in DEFAULT_QUERIES.keys()}

    metrics_data = await fetch_prometheus_metrics(
        list(DEFAULT_QUERIES.keys()), hosts=processed_instances
    )
    return metrics_data


@router.post("/prometheus/target")
async def add_prometheus_new_target(
    target: PrometheusTarget, ctx: RequestContext = Depends()
):
    """
    Add a new target to Prometheus targets file.
    :param target: PrometheusTarget object containing instance and labels
    :return: Success message
    """
    ctx.require_user()
    try:

        if ":" not in target.instance or ":9090" in target.instance:
            target.instance = f"{target.instance}:9100"
        entry = add_prometheus_target(target.instance, target.labels)
    except TargetSaveError as e:
        return {"error": str(e)}
    return {"message": "Target added successfully", "target": entry}
