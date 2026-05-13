"""Pydantic services models for prometheus & ansible."""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class HostRequest(BaseModel):
    """Pydantic model for a host input."""

    host: str | list
    extra_vars: dict


class AnsiblePlaybook(str, Enum):
    """Pydantic model for Ansible playbook execution request."""

    create_user = "create_user"
    scan_platform = "scan_platform"
    deploy_agent = "deploy_agent"
    delete_agent = "delete_agent"
    delete_ansible = "delete_ansible"


class DiscoveryRequest(BaseModel):
    """List of hosts to scan (IP or Hostname)."""

    hosts: List[str]
    target_team_id: Optional[int] = None
    extra_vars: Optional[dict] = {}


class PrometheusBase(BaseModel):
    """Base model for Prometheus target."""

    instance: str


class PrometheusTarget(PrometheusBase):
    """Pydantic model for Prometheus target."""

    labels: dict
    team_id: Optional[str] = None
