"""
Router for Ansible playbooks: creating Ansible user,
gathering platform information and deploying Node Exporter.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from enum import Enum

from app.database import get_db
from app.db.models import Machines, Metadata, Rooms, Disks, CPUs
from app.utils.ansible_service import parse_platform_report, run_playbook_task

from app.utils.redis_service import acquire_lock

from app.auth.dependencies import RequestContext

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
    delete_agent = "delete_agent"
    delete_ansible = "delete_ansible"


class DiscoveryRequest(BaseModel):
    """List of hosts to scan (IP or Hostname)."""

    hosts: List[str]
    extra_vars: Optional[dict] = {}


PLAYBOOK_MAP = {
    AnsiblePlaybook.create_user: f"{PLAYBOOK_DIR}/create_ansible_user.yaml",
    AnsiblePlaybook.scan_platform: f"{PLAYBOOK_DIR}/scan_platform.yaml",
    AnsiblePlaybook.deploy_agent: f"{PLAYBOOK_DIR}/deploy_agent.yaml",
    AnsiblePlaybook.delete_agent: f"{PLAYBOOK_DIR}/delete_agent.yaml",
    AnsiblePlaybook.delete_ansible: f"{PLAYBOOK_DIR}/delete_ansible.yaml",
}


def verify_machine_ownership(machine_id: int, db: Session, ctx: RequestContext):
    """Check if the machine belongs to the user's team.
    :param machine_id: ID of the machine to verify
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Machine object if ownership is verified
    """
    query = db.query(Machines).filter(Machines.id == machine_id)
    query = ctx.team_filter(query, Machines)
    machine = query.first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found or access denied.",
        )
    return machine


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
async def discover_hosts(
    request: DiscoveryRequest,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
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

    await run_playbook_task(
        PLAYBOOK_MAP[AnsiblePlaybook.scan_platform], request.hosts, request.extra_vars
    )

    results = []

    default_room = (
        db.query(Rooms)
        .filter(Rooms.name == "virtual", Rooms.team_id == ctx.team_id)
        .first()
    )

    if not default_room:
        default_room = Rooms(name="virtual", room_type="virtual", team_id=ctx.team_id)
        db.add(default_room)
        db.commit()
        db.refresh(default_room)

    for host in request.hosts:
        try:
            specs = parse_platform_report(host)

            machine = db.query(Machines).filter(Machines.name == host).first()

            if machine:
                has_changes = False

                if machine.ip_address != host:
                    machine.ip_address = host
                    has_changes = True

                for field in ["os", "ram", "mac_address", "ip_address"]:
                    if getattr(machine, field) != specs.get(field):
                        setattr(machine, field, specs.get(field))
                        has_changes = True

                db.query(CPUs).filter(CPUs.machine_id == machine.id).delete()
                for cpu_data in specs.get("cpus", []):
                    db.add(CPUs(name=cpu_data["name"], machine_id=machine.id))
                    has_changes = True

                db.query(Disks).filter(Disks.machine_id == machine.id).delete()
                for disk_data in specs.get("disks", []):
                    db.add(
                        Disks(
                            name=disk_data["name"],
                            capacity=disk_data.get("capacity"),
                            machine_id=machine.id,
                        )
                    )
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
                    team_id=ctx.team_id,
                    metadata_id=new_meta.id,
                    localization_id=default_room.id,
                    os=specs["os"],
                    ram=specs["ram"],
                    mac_address=specs["mac_address"],
                    ip_address=host,
                    added_on=datetime.now(),
                )
                db.add(new_machine)
                db.flush()

                for cpu_data in specs.get("cpus", []):
                    db.add(CPUs(name=cpu_data["name"], machine_id=new_machine.id))

                for disk_data in specs.get("disks", []):
                    db.add(
                        Disks(
                            name=disk_data["name"],
                            capacity=disk_data.get("capacity"),
                            machine_id=new_machine.id,
                        )
                    )
                results.append({"host": host, "status": "created"})

        except Exception as e:
            results.append({"host": host, "status": "error", "detail": str(e)})

    db.commit()
    return {"summary": results}


@router.post("/ansible/machine/{machine_id}/refresh")
async def refresh_machine_hardware(
    request: HostRequest,
    machine_id: int,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Refreshes hardware data for a specific machine from the database.
    Useful when components are replaced (e.g. CPU, RAM).
    :param request: HostRequest containing extra variables for Ansible
    :param machine_id: ID of the machine to refresh
    :param db: Active database session
    :return: Success message with updated specs or error details
    """
    machine = verify_machine_ownership(machine_id, db, ctx)
    host_address = machine.name

    await run_playbook_task(
        PLAYBOOK_MAP[AnsiblePlaybook.scan_platform], request.host, request.extra_vars
    )

    try:
        specs = parse_platform_report(host_address)
        machine_fields = [
            "os",
            "ram",
            "mac_address",
            "ip_address",
            "name",
        ]
        has_changes = False

        for field in machine_fields:
            new_value = specs.get(field)
            if getattr(machine, field) != new_value:
                setattr(machine, field, new_value)
                has_changes = True

        db.query(CPUs).filter(CPUs.machine_id == machine.id).delete()
        for cpu_data in specs.get("cpus", []):
            db.add(CPUs(name=cpu_data["name"], machine_id=machine.id))
            has_changes = True

        db.query(Disks).filter(Disks.machine_id == machine.id).delete()
        for disk_data in specs.get("disks", []):
            db.add(
                Disks(
                    name=disk_data["name"],
                    capacity=disk_data.get("capacity"),
                    machine_id=machine.id,
                )
            )
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


@router.post("/ansible/machine/{machine_id}/cleanup")
async def cleanup_machine(
    machine_id: int,
    request: HostRequest,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
     Delete ansible agent and node exporter from the machine and update metadata accordingly.
    :param machine_id: ID of the machine to clean up
    :param request: HostRequest containing extra variables for Ansible
    :param db: Active database session
    """
    async with acquire_lock(f"machine_lock:{machine_id}"):
        machine = verify_machine_ownership(machine_id, db, ctx)
        host = machine.name

        try:
            agent_result = await run_playbook_task(
                PLAYBOOK_MAP[AnsiblePlaybook.delete_agent], host, request.extra_vars
            )
            ansible_result = await run_playbook_task(
                PLAYBOOK_MAP[AnsiblePlaybook.delete_ansible], host, request.extra_vars
            )

            meta = db.query(Metadata).filter(Metadata.id == machine.metadata_id).first()
            if meta:
                meta.ansible_access = False
                meta.ansible_root_access = False
                meta.agent_prometheus = False
                meta.last_update = datetime.now().date()

            db.commit()

            return {
                "message": f"Host {host} was cleaned.",
                "agent_result": agent_result,
                "ansible_result": ansible_result,
            }

        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to cleanup machine: {str(e)}"
            ) from e


@router.post("/ansible/machine/{machine_id}/remove_agent")
async def remove_agent(
    machine_id: int,
    request: HostRequest,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
     Delete node exporter from the machine and update metadata accordingly.
    :param machine_id: ID of the machine to clean up
    :param request: HostRequest containing extra variables for Ansible
    :param db: Active database session
    """
    async with acquire_lock(f"machine_lock:{machine_id}"):
        machine = verify_machine_ownership(machine_id, db, ctx)
        host = machine.name
        try:
            agent_result = await run_playbook_task(
                PLAYBOOK_MAP[AnsiblePlaybook.delete_agent], host, request.extra_vars
            )

            meta = db.query(Metadata).filter(Metadata.id == machine.metadata_id).first()
            if meta:
                meta.agent_prometheus = False
                meta.last_update = datetime.now().date()

            db.commit()

            return {
                "message": f"Node Exporter was removed from host {host}.",
                "agent_result": agent_result,
            }

        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to remove agent from machine: {str(e)}"
            ) from e
