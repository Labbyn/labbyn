import asyncio
import json
from typing import Optional, Dict, Any, Set
from urllib.parse import unquote
from fastapi import WebSocket
from app.utils import redis_service
from app.core import exceptions
from .executor import PrometheusExecutor as exec
from .repository import PrometheusRepository as repo


class PrometheusService:
    """High-level service for Prometheus RBAC, target management, and WebSocket streaming."""

    def __init__(self, db, ctx):
        """Initialize the Prometheus service.

        :param db: Active database session for repository operations.
        :param ctx: The RequestContext object containing user identity and authorization logic.
        """
        self.db = db
        self.ctx = ctx

    def _extract_host(self, instance: str) -> str:
        """Extract the hostname or IP address from a Prometheus instance string.

        Example: '192.168.1.10:9100' -> '192.168.1.10'.

        :param instance: The raw instance string (usually host:port).
        :return: The extracted hostname/IP or the original string if no port is found.
        """
        if not instance:
            return instance
        return instance.rsplit(":", maxsplit=1)[0] if ":" in instance else instance

    async def stream_metrics(
        self, ws: WebSocket, instance_filter: Optional[str] = None
    ) -> None:
        """Maintain an indefinite loop streaming filtered metrics to a WebSocket client.

        Fetches raw data from Redis cache, parses it, and applies RBAC filters based
        on the user's allowed hosts before sending the payload.

        :param ws: The active WebSocket connection.
        :param instance_filter: Optional specific instance (host:port) to monitor.
                                If provided, detailed metrics for this host are returned.
        """
        allowed_hosts = await repo.get_allowed_hosts(self.db, self.ctx)

        while True:
            status_raw = await redis_service.get_cache(exec.CACHE_STATUS_KEY)
            metrics_raw = await redis_service.get_cache(exec.CACHE_METRICS_KEY)

            s_parsed = json.loads(status_raw) if status_raw else {}
            m_parsed = json.loads(metrics_raw) if metrics_raw else {}

            if instance_filter:
                target = unquote(instance_filter)
                if (
                    not self.ctx.is_admin
                    and self._extract_host(target) not in allowed_hosts
                ):
                    await ws.send_json(
                        {"error": "Access denied for the requested instance."}
                    )
                else:
                    await ws.send_json(
                        self._build_single_payload(target, s_parsed, m_parsed)
                    )
            else:
                await ws.send_json(
                    self._build_multi_payload(s_parsed, m_parsed, allowed_hosts)
                )

            await asyncio.sleep(exec.PUSH_INTERVAL)

    def _build_single_payload(
        self, target: str, s_db: dict, m_db: dict
    ) -> Dict[str, Any]:
        """Construct a detailed metrics payload for a single authorized host.

        :param target: The target instance string (host:port).
        :param s_db: Parsed status data from cache.
        :param m_db: Parsed metrics data from cache.
        :return: A dictionary containing online status and resource usage (CPU, RAM, Disks).
        """
        statuses = s_db.get("status", [])
        is_online = any(s["instance"] == target and s["value"] == 1.0 for s in statuses)
        return {
            "instance": target,
            "online": is_online,
            "cpu": (
                next(
                    (
                        m["value"]
                        for m in m_db.get("cpu_usage", [])
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
                        for m in m_db.get("memory_usage", [])
                        if m["instance"] == target
                    ),
                    None,
                )
                if is_online
                else None
            ),
            "disks": [
                {"value": round(m["value"], 2), "timestamp": m["timestamp"]}
                for m in m_db.get("disk_usage", [])
                if m["instance"] == target
            ],
        }

    def _build_multi_payload(
        self, s_db: dict, m_db: dict, allowed: Set[str]
    ) -> Dict[str, Any]:
        """Construct a multi-host dashboard payload filtered by user permissions.

        :param s_db: Parsed status data from cache.
        :param m_db: Parsed metrics data from cache.
        :param allowed: Set of hostnames the user is authorized to see.
        :return: A dictionary containing lists of statuses and metrics for all allowed hosts.
        """
        return {
            "statuses": [
                s
                for s in s_db.get("status", [])
                if self.ctx.is_admin or self._extract_host(s["instance"]) in allowed
            ],
            "metrics": {
                k: [
                    v
                    for v in vals
                    if self.ctx.is_admin or self._extract_host(v["instance"]) in allowed
                ]
                for k, vals in m_db.items()
            },
        }

    async def add_target(self, target_data) -> Dict[str, Any]:
        """Add a new scrape target to the Prometheus configuration with team-based labeling.

        Ensures the user has access to the specified team and automatically adds
        the appropriate 'team' label to the target metadata.

        :param target_data: Pydantic schema containing instance address and custom labels.
        :return: The newly created target entry as saved in the configuration.
        """
        self.ctx.require_user()
        team_id = target_data.team_id
        if not team_id:
            if len(self.ctx.team_ids) == 1:
                team_id = self.ctx.team_ids[0]
            elif not self.ctx.is_admin:
                raise exceptions.ValidationError(
                    "User belongs to multiple teams. Please select one."
                )

        if team_id:
            await self.ctx.validate_team_access(team_id)
            name = await repo.get_team_name(self.db, team_id)
            target_data.labels["team"] = name or f"team_{team_id}"

        instance = target_data.instance
        if ":" not in instance or ":9090" in instance:
            instance = f"{instance}:9100"

        async with exec._targets_lock:
            targets = await exec.load_targets()
            entry = {"targets": [instance], "labels": target_data.labels}
            targets.append(entry)
            await exec.save_targets(targets)
            return entry

    async def remove_target(self, instance_raw: str) -> None:
        """Remove an existing scrape target from the Prometheus configuration.

        Verifies that the user has administrative privileges or that the machine
        belongs to one of the user's teams before deletion.

        :param instance_raw: The raw instance string to be removed (will be unquoted and normalized).
        """
        instance = unquote(instance_raw.strip())
        if ":" not in instance or ":9090" in instance:
            instance = f"{instance}:9100"

        if not self.ctx.is_admin:
            allowed = await repo.get_allowed_hosts(self.db, self.ctx)
            if self._extract_host(instance) not in allowed:
                raise exceptions.AccessDeniedError(
                    f"Access denied: machine '{instance}' not found in your team."
                )

        async with exec._targets_lock:
            targets = await exec.load_targets()
            new_targets = [t for t in targets if instance not in t.get("targets", [])]
            if len(new_targets) == len(targets):
                raise exceptions.ObjectNotFoundError("Prometheus Target", instance)
            await exec.save_targets(new_targets)
