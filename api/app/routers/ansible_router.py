"""
Router for Ansible playbooks: creating Ansible user,
gathering platform information and deploying Node Exporter.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from enum import Enum

from app.database import get_db
from app.db.models import Machines, Metadata, Rooms
from app.utils.ansible_service import parse_platform_report, run_playbook_task

router = APIRouter()

REPORTS_DIR = "./platform_reports"
PLAYBOOK_DIR = "/code/ansible"


class HostRequest(BaseModel):
    """
    Pydantic model for a host input.
    """

    host: str | list
    extra_vars: dict


class AnsiblePlaybook(str, Enum):
    """
    Pydantic model for Ansible playbook execution request.
    """

    create_user = "create_user"
    scan_platform = "scan_platform"
    deploy_agent = "deploy_agent"


class DiscoveryRequest(BaseModel):
    """List of hosts to scan (IP or Hostname)."""

    hosts: List[str]
    extra_vars: Optional[dict] = {}


PLAYBOOK_MAP = {
    AnsiblePlaybook.create_user: "/code/ansible/create_ansible_user.yaml",
    AnsiblePlaybook.scan_platform: "/code/ansible/scan_platform.yaml",
    AnsiblePlaybook.deploy_agent: "/code/ansible/deploy_agent.yaml",
}


@router.post("/ansible/create_user")
async def create_ansible_user(request: HostRequest):
    """
    Create Ansible user on a host.
    :param request: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    return await run_playbook_task(
        PLAYBOOK_MAP[AnsiblePlaybook.create_user], request.host, request.extra_vars
    )


@router.post("/ansible/scan_platform")
async def scan_platform(request: HostRequest):
    """
    Gather information about platform.
    :param reqest: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    return await run_playbook_task(
        PLAYBOOK_MAP[AnsiblePlaybook.scan_platform], request.host, request.extra_vars
    )


@router.post("/ansible/deploy_agent")
async def deploy_agent(request: HostRequest):
    """
    Deploy Node Exporter on a host.
    :param request: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    return await run_playbook_task(
        PLAYBOOK_MAP[AnsiblePlaybook.deploy_agent], request.host, request.extra_vars
    )


@router.post("/ansible/setup_agent")
async def setup_agent(request: HostRequest):
    """
    Workflow endpoint: first create Ansible user (if needed), then deploy Node Exporter.
    :param request: HostRequest containing the host IP or hostname
    :return: Combined results of both steps
    """
    try:
        user_result = await run_playbook_task(
            PLAYBOOK_MAP[AnsiblePlaybook.create_user], request.host, request.extra_vars
        )

        deploy_result = await run_playbook_task(
            PLAYBOOK_MAP[AnsiblePlaybook.deploy_agent], request.host, request.extra_vars
        )
    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Unexpected error during setup_agent workflow: {e}"
        )

    return {
        "user_creation": user_result,
        "node_exporter_deployment": deploy_result,
    }


@router.post("/ansible/discovery")
async def discover_hosts(request: DiscoveryRequest, db: Session = Depends(get_db)):
    """
    Discovery:
    1. Scans provided hosts (IP/Hostname) using Ansible (playbook 'scan_platform').
    2. Ansible saves JSON reports to disk.
    3. API reads reports.
    4. If host does not exist in DB -> Creates it (Machines + Metadata) in 'virtual' room.
    5. If exists -> Updates data (Hardware Refresh).

    :param req: DiscoveryRequest containing list of hosts to scan
    :param db: Active database session
    :return: Summary of created/updated hosts
    """
    if not request.hosts:
        raise HTTPException(status_code=400, detail="Host list cannot be empty.")

    await run_playbook_task(PLAYBOOK_MAP[AnsiblePlaybook.scan_platform], request.hosts, request.extra_vars)

    results = []

    default_room = db.query(Rooms).filter(Rooms.name == "virtual").first()

    if not default_room:
        default_room = Rooms(name="virtual", room_type="virtual")
        db.add(default_room)
        db.commit()
        db.refresh(default_room)

    for host in request.hosts:
        try:
            specs = parse_platform_report(host)

            machine = db.query(Machines).filter(Machines.name == host).first()

            if machine:
                has_changes = False

                if machine.os != specs["os"]:
                    machine.os = specs["os"]
                    has_changes = True
                if machine.cpu != specs["cpu"]:
                    machine.cpu = specs["cpu"]
                    has_changes = True
                if machine.ram != specs["ram"]:
                    machine.ram = specs["ram"]
                    has_changes = True
                if machine.disk != specs["disk"]:
                    machine.disk = specs["disk"]
                    has_changes = True
                if machine.mac_address != specs["mac_address"]:
                    machine.mac_address = specs["mac_address"]
                    has_changes = True

                meta = (
                    db.query(Metadata)
                    .filter(Metadata.id == machine.metadata_id)
                    .first()
                )
                if meta:
                    meta.ansible_access = True
                    meta.ansible_root_access = True
                    if meta.agent_prometheus != specs["agent_prometheus"]:
                        meta.agent_prometheus = specs["agent_prometheus"]
                        has_changes = True

                    if has_changes:
                        meta.last_update = datetime.now()
                        results.append({"host": host, "status": "updated"})
                    else:
                        results.append({"host": host, "status": "no_changes"})

            else:
                new_meta = Metadata(
                    last_update=datetime.now(),
                    agent_prometheus=specs["agent_prometheus"],
                    ansible_access=True,
                    ansible_root_access=True,
                )
                db.add(new_meta)
                db.flush()

                new_machine = Machines(
                    name=host,
                    metadata_id=new_meta.id,
                    localization_id=default_room.id,
                    os=specs["os"],
                    cpu=specs["cpu"],
                    ram=specs["ram"],
                    disk=specs["disk"],
                    mac_address=specs["mac_address"],
                    added_on=datetime.now(),
                )
                db.add(new_machine)
                results.append({"host": host, "status": "created"})

        except Exception as e:
            results.append({"host": host, "status": "error", "detail": str(e)})

    db.commit()
    return {"summary": results}


@router.post("/ansible/machine/{machine_id}/refresh")
async def refresh_machine_hardware(request: HostRequest, machine_id: int, db: Session = Depends(get_db)):
    """
    Refreshes hardware data for a specific machine from the database.
    Useful when components are replaced (e.g. CPU, RAM).
    :param machine_id: ID of the machine to refresh
    :param db: Active database session
    :return: Success message with updated specs or error details
    """
    if not request.host:
        raise HTTPException(status_code=400, detail="Host cannot be empty.")


    machine = db.query(Machines).filter(Machines.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    host_address = machine.name

    await run_playbook_task(PLAYBOOK_MAP[AnsiblePlaybook.scan_platform], request.host, request.extra_vars)

    try:
        specs = parse_platform_report(host_address)

        has_changes = False
        if machine.os != specs["os"]:
            machine.os = specs["os"]
            has_changes = True
        if machine.cpu != specs["cpu"]:
            machine.cpu = specs["cpu"]
            has_changes = True
        if machine.ram != specs["ram"]:
            machine.ram = specs["ram"]
            has_changes = True
        if machine.disk != specs["disk"]:
            machine.disk = specs["disk"]
            has_changes = True
        if machine.mac_address != specs["mac_address"]:
            machine.mac_address = specs["mac_address"]
            has_changes = True

        meta = db.query(Metadata).filter(Metadata.id == machine.metadata_id).first()
        if meta:
            meta.ansible_access = True
            meta.ansible_root_access = True

            if meta.agent_prometheus != specs["agent_prometheus"]:
                meta.agent_prometheus = specs["agent_prometheus"]
                has_changes = True

            if has_changes:
                meta.last_update = datetime.now()

        db.commit()
        db.refresh(machine)

        return {
            "message": "Machine hardware info updated successfully",
            "data": specs,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to process scan report: {str(e)}"
        ) from e
