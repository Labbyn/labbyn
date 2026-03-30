"""Router for Prometheus metrics and WebSocket endpoint."""

import asyncio
import json
import os
from typing import List, Optional
from urllib.parse import unquote

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Query, Response, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.auth.auth_config import get_database_strategy
from app.auth.dependencies import RequestContext
from app.auth.manager import get_user_manager
from app.core.exceptions import AccessDeniedError, ValidationError

from ..database import get_async_db
from ..db.models import Machines, Teams
from ..db.schemas import PrometheusBase, PrometheusTarget
from ..utils.prometheus_service import (
    DEFAULT_QUERIES,
    TargetSaveError,
    add_prometheus_target,
    fetch_prometheus_metrics,
    remove_prometheus_target,
)
from ..utils.redis_service import get_cache, set_cache

load_dotenv(".env/api.env")
HOST_STATUS_INTERVAL = int(os.getenv("HOST_STATUS_INTERVAL"))
OTHER_METRICS_INTERVAL = int(os.getenv("OTHER_METRICS_INTERVAL"))
WEBSOCKET_PUSH_INTERVAL = int(os.getenv("WEBSOCKET_PUSH_INTERVAL"))
PROMETEUS_CACHE_STATUS_KEY = "prometheus_metrics_cache"
PROMETEUS_CACHE_METRICS_KEY = "prometheus_other_metrics_cache"

router = APIRouter(tags=["Prometheus"])


def _extract_host_from_instance(instance: str):
    """Extract hostname/IP from Prometheus instance string.

    :param instance: Prometheus instance string (e.g., "
    :return: Hostname/IP part of the instance.
    """
    if not instance:
        return instance
    return instance.rsplit(":", maxsplit=1)[0] if ":" in instance else instance


# pylint: disable=too-few-public-methods
class WSConnectionManager:
    """Create global websocket connection."""

    def __init__(self):
        """Create webscoket connection."""
        self.websocket = None

    def disconnect(self):
        """Disconnect the websocket connection."""
        self.websocket = None


manager = WSConnectionManager()


async def status_worker():
    """Periodically fetch host status metrics and store them in cache.

    :return: None.
    """
    while True:
        status = await fetch_prometheus_metrics(metrics=["status"], hosts=None)
        await set_cache(PROMETEUS_CACHE_STATUS_KEY, json.dumps(status))
        await asyncio.sleep(HOST_STATUS_INTERVAL)


async def metrics_worker():
    """Periodically fetch CPU, RAM, Disk usage metrics and store them in cache.

    :return: None.
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
    db: AsyncSession = Depends(get_async_db),
    user_manager=Depends(get_user_manager),
    strategy=Depends(get_database_strategy),
):
    """WebSocket endpoint to push metrics data to front-end.

    Websocket will send cached metrics data at regular intervals,
    to reduce load on API server and Prometheus.
    :param ws: WebSocket connection
    :param instance: Optional instance filter
    :return: Fetch ws data
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
        ctx = await RequestContext.for_websocket(user, db)
        query = select(Machines.name)
        query = ctx.team_filter(query, Machines)
        result = await db.execute(query)
        allowed_hosts = {row[0] for row in result.all()}
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
                    "cpu": (
                        next(
                            (
                                m["value"]
                                for m in metrics_parsed.get("cpu_usage", [])
                                if m["instance"] == target
                            ),
                            None,
                        )
                        if is_online
                        else None
                    ),
                    "memory": (
                        next(
                            (
                                m["value"]
                                for m in metrics_parsed.get("memory_usage", [])
                                if m["instance"] == target
                            ),
                            None,
                        )
                        if is_online
                        else None
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
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """Fetch all unique host instances [HOST::PORT] from Prometheus.

    :return: List of unique hosts.
    """
    ctx.require_user()
    payload = await fetch_prometheus_metrics(metrics=["status"], hosts=None)

    query = select(Machines.name)
    query = ctx.team_filter(query, Machines)
    result = await db.execute(query)
    allowed_hosts = {row[0] for row in result.all()}

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
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """Fetch all unique hosts [ex.192.168.1.2, server1-example.com] from Prometheus.

    :return: List of unique hostnames/IPs.
    """
    ctx.require_user()

    payload = await fetch_prometheus_metrics(metrics=["status"], hosts=None)
    query = select(Machines.name)
    query = ctx.team_filter(query, Machines)
    result = await db.execute(query)
    allowed_hosts = {row[0] for row in result.all()}

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
        description="List of instances or comma-separated string "
        "(e.g. host1:9100,host2:9100)",
    ),
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """Fetch metrics for selected instances directly from Prometheus (bypasses cache).

    :param instances: List of instances as comma separated string
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Metrics data for selected instances, or all if none specified.
    """
    ctx.require_user()

    query = select(Machines.name)
    query = ctx.team_filter(query, Machines)
    result = await db.execute(query)
    allowed_hosts = {row[0] for row in result.all()}

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
    target: PrometheusTarget, ctx: RequestContext = Depends(RequestContext.create)
):
    """Add a new target to Prometheus targets file.

    :param target: PrometheusTarget object containing instance and labels
    :param ctx: Request context for user and team info
    :return: Success message.
    """
    ctx.require_user()

    try:
        selected_team_id = target.team_id

        if not selected_team_id:
            if len(ctx.team_ids) == 1:
                selected_team_id = ctx.team_ids[0]
            elif len(ctx.team_ids) > 1:
                raise ValidationError("You are in multiple teams, please select one.")
            else:
                if not ctx.is_admin:
                    raise AccessDeniedError("You are not in any team.")
        if selected_team_id:
            await ctx.validate_team_access(selected_team_id)

            stmt = select(Teams.name).where(Teams.id == selected_team_id)
            res = await ctx.db.execute(stmt)
            team_name = res.scalar_one_or_none()
            target.labels["team"] = team_name or f"team_{selected_team_id}"

        if ":" not in target.instance or ":9090" in target.instance:
            target.instance = f"{target.instance}:9100"
        entry = await add_prometheus_target(target.instance, target.labels)
    except TargetSaveError as e:
        raise ValidationError(f"Failed to save target '{target.instance}'") from e
    return {"message": "Target added successfully", "target": entry}


@router.delete("/prometheus/target", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prometheus_target(
    target: PrometheusBase,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """Add a new target to Prometheus targets file.

    :param target: Prometheus istnace object containing instance and labels
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success message.
    """
    ctx.require_user()

    raw_instance = target.instance.strip()
    target_to_remove = unquote(raw_instance)

    if ":" not in target_to_remove or ":9090" in target_to_remove:
        target_to_remove = f"{target_to_remove}:9100"

    host_only = _extract_host_from_instance(target_to_remove)

    if not ctx.is_admin:
        query = select(Machines.name).filter(Machines.name == host_only)
        query = ctx.team_filter(query, Machines)
        result = await db.execute(query)
        machine = result.scalar_one_or_none()

        if not machine:
            raise AccessDeniedError(
                f"Access denied or machine '{host_only}' not found in your team."
            )

    await remove_prometheus_target(target_to_remove)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
