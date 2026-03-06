"""
Router for Ansible playbooks: creating Ansible user,
gathering platform information and deploying Node Exporter.
"""

import asyncio
from datetime import datetime
from typing import List, Optional, Union

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from enum import Enum

from app.database import get_async_db
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
    target_team_id: Optional[int] = None
    extra_vars: Optional[dict] = {}


PLAYBOOK_MAP = {
    AnsiblePlaybook.create_user: f"{PLAYBOOK_DIR}/create_ansible_user.yaml",
    AnsiblePlaybook.scan_platform: f"{PLAYBOOK_DIR}/scan_platform.yaml",
    AnsiblePlaybook.deploy_agent: f"{PLAYBOOK_DIR}/deploy_agent.yaml",
    AnsiblePlaybook.delete_agent: f"{PLAYBOOK_DIR}/delete_agent.yaml",
    AnsiblePlaybook.delete_ansible: f"{PLAYBOOK_DIR}/delete_ansible.yaml",
}


async def verify_machine_ownership(
    machine_id: int, db: AsyncSession, ctx: RequestContext
):
    """
    Check if the machine belongs to the user's team.
    Supports both Sync and Async sessions.
    """
    stmt = select(Machines).where(Machines.id == machine_id)
    stmt = ctx.team_filter(stmt, Machines)

    result = await db.execute(stmt)
    machine = result.scalar_one_or_none()

    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found or access denied.",
        )
    return machine


@router.post("/ansible/create_user")
async def create_ansible_user(
    request: HostRequest, ctx: RequestContext = Depends(RequestContext.create)
):
    """
    Create Ansible user on a host.
    :param request: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    ctx.require_user()
    return await run_playbook_task(
        PLAYBOOK_MAP[AnsiblePlaybook.create_user], request.host, request.extra_vars
    )


@router.post("/ansible/scan_platform")
async def scan_platform(
    request: HostRequest, ctx: RequestContext = Depends(RequestContext.create)
):
    """
    Gather information about platform.
    :param reqest: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    ctx.require_user()
    return await run_playbook_task(
        PLAYBOOK_MAP[AnsiblePlaybook.scan_platform], request.host, request.extra_vars
    )


@router.post("/ansible/deploy_agent")
async def deploy_agent(
    request: HostRequest, ctx: RequestContext = Depends(RequestContext.create)
):
    """
    Deploy Node Exporter on a host.
    :param request: HostRequest containing the host IP or hostname
    :return: Success or error message
    """
    ctx.require_user()
    return await run_playbook_task(
        PLAYBOOK_MAP[AnsiblePlaybook.deploy_agent], request.host, request.extra_vars
    )


@router.post("/ansible/setup_agent")
async def setup_agent(
    request: HostRequest, ctx: RequestContext = Depends(RequestContext.create)
):
    """
    Workflow endpoint: first create Ansible user (if needed), then deploy Node Exporter.
    :param request: HostRequest containing the host IP or hostname
    :return: Combined results of both steps
    """
    ctx.require_user()

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
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    ctx.require_user()
    if not request.hosts:
        raise HTTPException(status_code=400, detail="Host list cannot be empty.")

    target_team_id = request.target_team_id
    if not target_team_id:
        if len(ctx.team_ids) == 1:
            target_team_id = ctx.team_ids[0]
        else:
            raise HTTPException(status_code=400, detail="Target team ID required.")
    elif not ctx.is_admin and target_team_id not in ctx.team_ids:
        raise HTTPException(status_code=403, detail="Access denied for this team.")

    await run_playbook_task(
        PLAYBOOK_MAP[AnsiblePlaybook.scan_platform], request.hosts, request.extra_vars
    )

    results = []
    res_room = await db.execute(
        select(Rooms).filter(Rooms.name == "virtual", Rooms.team_id == target_team_id)
    )
    default_room = res_room.scalar_one_or_none()

    if not default_room:
        default_room = Rooms(
            name="virtual", room_type="virtual", team_id=target_team_id
        )
        db.add(default_room)
        await db.commit()
        await db.refresh(default_room)

    for host in request.hosts:
        try:
            specs = parse_platform_report(host)
            stmt = select(Machines).filter(Machines.name == host)
            stmt = ctx.team_filter(stmt, Machines)
            m_res = await db.execute(stmt)
            machine = m_res.scalar_one_or_none()

            if machine:
                for field in ["os", "ram", "mac_address", "ip_address"]:
                    setattr(machine, field, specs.get(field))

                await db.execute(delete(CPUs).where(CPUs.machine_id == machine.id))
                for cpu_data in specs.get("cpus", []):
                    db.add(CPUs(name=cpu_data["name"], machine_id=machine.id))

                await db.execute(delete(Disks).where(Disks.machine_id == machine.id))
                for disk_data in specs.get("disks", []):
                    db.add(
                        Disks(
                            name=disk_data["name"],
                            capacity=disk_data.get("capacity"),
                            machine_id=machine.id,
                        )
                    )

                meta_res = await db.execute(
                    select(Metadata).where(Metadata.id == machine.metadata_id)
                )
                meta = meta_res.scalar_one_or_none()
                if meta:
                    meta.ansible_access = True
                    meta.agent_prometheus = specs["agent_prometheus"]
                    meta.last_update = datetime.now()
                results.append({"host": host, "status": "updated"})
            else:
                new_meta = Metadata(
                    last_update=datetime.now(),
                    agent_prometheus=specs["agent_prometheus"],
                    ansible_access=True,
                    ansible_root_access=True,
                )
                db.add(new_meta)
                await db.flush()

                new_machine = Machines(
                    name=host,
                    team_id=target_team_id,
                    metadata_id=new_meta.id,
                    localization_id=default_room.id,
                    os=specs["os"],
                    ram=specs["ram"],
                    mac_address=specs["mac_address"],
                    ip_address=host,
                    added_on=datetime.now(),
                )
                db.add(new_machine)
                await db.flush()

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

    await db.commit()
    return {"summary": results}


@router.post("/ansible/machine/{machine_id}/refresh")
async def refresh_machine_hardware(
    request: HostRequest,
    machine_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    machine = await verify_machine_ownership(machine_id, db, ctx)
    await run_playbook_task(
        PLAYBOOK_MAP[AnsiblePlaybook.scan_platform], [machine.name], request.extra_vars
    )

    try:
        specs = parse_platform_report(machine.name)
        for field in ["os", "ram", "mac_address", "ip_address", "name"]:
            setattr(machine, field, specs.get(field))

        await db.execute(delete(CPUs).where(CPUs.machine_id == machine.id))
        for cpu_data in specs.get("cpus", []):
            db.add(CPUs(name=cpu_data["name"], machine_id=machine.id))

        await db.execute(delete(Disks).where(Disks.machine_id == machine.id))
        for disk_data in specs.get("disks", []):
            db.add(
                Disks(
                    name=disk_data["name"],
                    capacity=disk_data.get("capacity"),
                    machine_id=machine.id,
                )
            )

        meta_res = await db.execute(
            select(Metadata).where(Metadata.id == machine.metadata_id)
        )
        meta = meta_res.scalar_one_or_none()
        if meta:
            meta.ansible_access = True
            meta.agent_prometheus = specs["agent_prometheus"]
            meta.last_update = datetime.now()

        await db.commit()
        return {"message": "Updated successfully", "data": specs}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ansible/machine/{machine_id}/cleanup")
async def cleanup_machine(
    machine_id: int,
    request: HostRequest,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    async with acquire_lock(f"machine_lock:{machine_id}"):
        machine = await verify_machine_ownership(machine_id, db, ctx)
        try:
            agent_res = await run_playbook_task(
                PLAYBOOK_MAP[AnsiblePlaybook.delete_agent],
                machine.name,
                request.extra_vars,
            )
            ansible_res = await run_playbook_task(
                PLAYBOOK_MAP[AnsiblePlaybook.delete_ansible],
                machine.name,
                request.extra_vars,
            )

            meta_res = await db.execute(
                select(Metadata).where(Metadata.id == machine.metadata_id)
            )
            meta = meta_res.scalar_one_or_none()
            if meta:
                meta.ansible_access = False
                meta.ansible_root_access = False
                meta.agent_prometheus = False
                meta.last_update = datetime.now()

            await db.commit()
            return {
                "message": "Cleaned",
                "agent_result": agent_res,
                "ansible_result": ansible_res,
            }
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/ansible/machine/{machine_id}/remove_agent")
async def remove_agent(
    machine_id: int,
    request: HostRequest,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    async with acquire_lock(f"machine_lock:{machine_id}"):
        machine = await verify_machine_ownership(machine_id, db, ctx)
        try:
            agent_res = await run_playbook_task(
                PLAYBOOK_MAP[AnsiblePlaybook.delete_agent],
                machine.name,
                request.extra_vars,
            )
            meta_res = await db.execute(
                select(Metadata).where(Metadata.id == machine.metadata_id)
            )
            meta = meta_res.scalar_one_or_none()
            if meta:
                meta.agent_prometheus = False
                meta.last_update = datetime.now()

            await db.commit()
            return {"message": "Agent removed", "agent_result": agent_res}
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
