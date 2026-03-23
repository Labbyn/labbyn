"""Router for Ansible playbooks.

Creating Ansible user, gathering platform information and deploying Node Exporter.
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import service_schemas
from app.utils import ansible_service, redis_service

router = APIRouter(tags=["Ansible"])

REPORTS_DIR = "./platform_reports"
PLAYBOOK_DIR = "/code/ansible"

PLAYBOOK_MAP = {
    service_schemas.AnsiblePlaybook.create_user: f"{PLAYBOOK_DIR}/create_ansible_user.yaml",
    service_schemas.AnsiblePlaybook.scan_platform: f"{PLAYBOOK_DIR}/scan_platform.yaml",
    service_schemas.AnsiblePlaybook.deploy_agent: f"{PLAYBOOK_DIR}/deploy_agent.yaml",
    service_schemas.AnsiblePlaybook.delete_agent: f"{PLAYBOOK_DIR}/delete_agent.yaml",
    service_schemas.AnsiblePlaybook.delete_ansible: f"{PLAYBOOK_DIR}/delete_ansible.yaml",
}


@router.post("/ansible/create_user")
async def create_ansible_user(
    request: service_schemas.HostRequest,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create Ansible user on a host.

    :param request: HostRequest containing the host IP or hostname
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    ctx.require_user()
    try:
        return await ansible_service.run_playbook_task(
            PLAYBOOK_MAP[service_schemas.AnsiblePlaybook.create_user],
            request.host,
            request.extra_vars,
        )
    except Exception as e:
        raise exceptions.ExternalServiceError(
            f"Ansible (User Creation: {request.host}) failed", str(e)
        ) from e


@router.post("/ansible/scan_platform")
async def scan_platform(
    request: service_schemas.HostRequest,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Gather information about platform.

    :param request: HostRequest containing the host IP or hostname
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    ctx.require_user()
    try:
        return await ansible_service.run_playbook_task(
            PLAYBOOK_MAP[service_schemas.AnsiblePlaybook.scan_platform],
            request.host,
            request.extra_vars,
        )
    except Exception as e:
        raise exceptions.ExternalServiceError(
            f"Ansible (Platform Scan: {request.host}) failed", str(e)
        ) from e


@router.post("/ansible/deploy_agent")
async def deploy_agent(
    request: service_schemas.HostRequest,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Deploy Node Exporter on a host.

    :param request: HostRequest containing the host IP or hostname
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    ctx.require_user()
    try:
        return await ansible_service.run_playbook_task(
            PLAYBOOK_MAP[service_schemas.AnsiblePlaybook.deploy_agent],
            request.host,
            request.extra_vars,
        )
    except Exception as e:
        raise exceptions.ExternalServiceError(
            f"Node Exporter (Prometheus Deployment: {request.host}) failed", str(e)
        ) from e


@router.post("/ansible/setup_agent")
async def setup_agent(
    request: service_schemas.HostRequest,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create Ansible user (if needed), then deploy Node Exporter.

    :param request: HostRequest containing the host IP or hostname
    :param ctx: Request context for user and team info
    :return: Combined results of both steps.
    """
    ctx.require_user()

    try:
        user_result = await ansible_service.run_playbook_task(
            PLAYBOOK_MAP[service_schemas.AnsiblePlaybook.create_user],
            request.host,
            request.extra_vars,
        )

        deploy_result = await ansible_service.run_playbook_task(
            PLAYBOOK_MAP[service_schemas.AnsiblePlaybook.deploy_agent],
            request.host,
            request.extra_vars,
        )
        return {
            "user_creation": user_result,
            "node_exporter_deployment": deploy_result,
        }
    except Exception as e:
        raise exceptions.ExternalServiceError(
            f"Ansible + Prometheus Workflow ({request.host}) failed", str(e)
        ) from e


@router.post("/ansible/discovery")
async def discover_hosts(
    request: service_schemas.DiscoveryRequest,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Discover hosts not connected to database.

    :param request: DiscoveryRequest containing the host IP or hostname
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    ctx.require_user()
    if not request.hosts:
        raise exceptions.ValidationError("Host list cannot be empty.")

    target_team_id = request.target_team_id
    if not target_team_id:
        if len(ctx.team_ids) == 1:
            target_team_id = ctx.team_ids[0]
        else:
            raise exceptions.ValidationError("Target team ID required.")

    await ctx.validate_team_access(target_team_id)

    try:
        await ansible_service.run_playbook_task(
            PLAYBOOK_MAP[service_schemas.AnsiblePlaybook.scan_platform],
            request.hosts,
            request.extra_vars,
        )
    except Exception as e:
        hosts_str = ", ".join(request.hosts)
        raise exceptions.ExternalServiceError(
            f"Ansible Discovery Scan for hosts [{hosts_str}] failed", str(e)
        ) from e

    results = []
    res_room = await db.execute(
        sql.select(models.Rooms).filter(
            models.Rooms.name == "virtual", models.Rooms.team_id == target_team_id
        )
    )
    default_room = res_room.scalar_one_or_none()

    if not default_room:
        default_room = models.Rooms(
            name="virtual", room_type="virtual", team_id=target_team_id
        )
        db.add(default_room)
        await db.commit()
        await db.refresh(default_room)

    for host in request.hosts:
        try:
            specs = ansible_service.parse_platform_report(host)
            stmt = sql.select(models.Machines).filter(models.Machines.name == host)
            stmt = ctx.team_filter(stmt, models.Machines)
            m_res = await db.execute(stmt)
            machine = m_res.scalar_one_or_none()

            if machine:
                for field in ["os", "ram", "mac_address", "ip_address"]:
                    setattr(machine, field, specs.get(field))

                await db.execute(
                    sql.delete(models.CPUs).where(models.CPUs.machine_id == machine.id)
                )
                for cpu_data in specs.get("cpus", []):
                    db.add(models.CPUs(name=cpu_data["name"], machine_id=machine.id))

                await db.execute(
                    sql.delete(models.Disks).where(
                        models.Disks.machine_id == machine.id
                    )
                )
                for disk_data in specs.get("disks", []):
                    db.add(
                        models.Disks(
                            name=disk_data["name"],
                            capacity=disk_data.get("capacity"),
                            machine_id=machine.id,
                        )
                    )

                meta_res = await db.execute(
                    sql.select(models.Metadata).where(
                        models.Metadata.id == machine.metadata_id
                    )
                )
                meta = meta_res.scalar_one_or_none()
                if meta:
                    meta.ansible_access = True
                    meta.agent_prometheus = specs["agent_prometheus"]
                    meta.last_update = datetime.now()
                results.append({"host": host, "status": "updated"})
            else:
                new_meta = models.Metadata(
                    last_update=datetime.now(),
                    agent_prometheus=specs["agent_prometheus"],
                    ansible_access=True,
                    ansible_root_access=True,
                )
                db.add(new_meta)
                await db.flush()

                new_machine = models.Machines(
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
                    db.add(
                        models.CPUs(name=cpu_data["name"], machine_id=new_machine.id)
                    )
                for disk_data in specs.get("disks", []):
                    db.add(
                        models.Disks(
                            name=disk_data["name"],
                            capacity=disk_data.get("capacity"),
                            machine_id=new_machine.id,
                        )
                    )
                results.append({"host": host, "status": "created"})

        except Exception as e:
            results.append(
                {
                    "host": host,
                    "status": "error",
                    "detail": f"Data processing for {host} failed: {str(e)}",
                }
            )

    await db.commit()
    return {"summary": results}


@router.post("/ansible/machine/{machine_id}/refresh")
async def refresh_machine_hardware(
    request: service_schemas.HostRequest,
    machine_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Refresh information about machine hardware.

    :param request: DiscoveryRequest containing the host IP or hostname
    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    stmt = sql.select(models.Machines).filter(models.Machines.id == machine_id)
    machine = (
        await db.execute(ctx.team_filter(stmt, models.Machines))
    ).scalar_one_or_none()

    try:
        await ansible_service.run_playbook_task(
            PLAYBOOK_MAP[service_schemas.AnsiblePlaybook.scan_platform],
            [machine.name],
            request.extra_vars,
        )
        specs = ansible_service.parse_platform_report(machine.name)
        for field in ["os", "ram", "mac_address", "ip_address", "name"]:
            setattr(machine, field, specs.get(field))

        await db.execute(
            sql.delete(models.CPUs).where(models.CPUs.machine_id == machine.id)
        )
        for cpu_data in specs.get("cpus", []):
            db.add(models.CPUs(name=cpu_data["name"], machine_id=machine.id))

        await db.execute(
            sql.delete(models.Disks).where(models.Disks.machine_id == machine.id)
        )
        for disk_data in specs.get("disks", []):
            db.add(
                models.Disks(
                    name=disk_data["name"],
                    capacity=disk_data.get("capacity"),
                    machine_id=machine.id,
                )
            )

        meta_res = await db.execute(
            sql.select(models.Metadata).where(models.Metadata.id == machine.metadata_id)
        )
        meta = meta_res.scalar_one_or_none()
        if meta:
            meta.ansible_access = True
            meta.agent_prometheus = specs["agent_prometheus"]
            meta.last_update = datetime.now()

        await db.commit()
        return {
            "message": f"Hardware for {machine.name} refreshed successfully",
            "data": specs,
        }
    except Exception as e:
        await db.rollback()
        raise exceptions.ExternalServiceError(
            f"Hardware Refresh for {machine.name} failed", str(e)
        ) from e


@router.post("/ansible/machine/{machine_id}/cleanup")
async def cleanup_machine(
    machine_id: int,
    request: service_schemas.HostRequest,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete Ansible/Node exporters from machine.

    :param machine_id: Machine ID
    :param request: DiscoveryRequest containing the host IP or hostname
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    async with redis_service.acquire_lock(f"machine_lock:{machine_id}"):
        stmt = sql.select(models.Machines).filter(models.Machines.id == machine_id)
        machine = (
            await db.execute(ctx.team_filter(stmt, models.Machines))
        ).scalar_one_or_none()
        try:
            agent_res = await ansible_service.run_playbook_task(
                PLAYBOOK_MAP[service_schemas.AnsiblePlaybook.delete_agent],
                machine.name,
                request.extra_vars,
            )
            ansible_res = await ansible_service.run_playbook_task(
                PLAYBOOK_MAP[service_schemas.AnsiblePlaybook.delete_ansible],
                machine.name,
                request.extra_vars,
            )

            meta_res = await db.execute(
                sql.select(models.Metadata).where(
                    models.Metadata.id == machine.metadata_id
                )
            )
            meta = meta_res.scalar_one_or_none()
            if meta:
                meta.ansible_access = False
                meta.ansible_root_access = False
                meta.agent_prometheus = False
                meta.last_update = datetime.now()

            await db.commit()
            return {
                "message": f"Cleanup for {machine.name} completed",
                "agent": agent_res,
                "ansible": ansible_res,
            }
        except Exception as e:
            await db.rollback()
            raise exceptions.ExternalServiceError(
                f"Ansible Cleanup for {machine.name} failed", str(e)
            ) from e


@router.post("/ansible/machine/{machine_id}/remove_agent")
async def remove_agent(
    machine_id: int,
    request: service_schemas.HostRequest,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete Node exporter from machine.

    :param machine_id: Machine ID
    :param request: DiscoveryRequest containing the host IP or hostname
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    async with redis_service.acquire_lock(f"machine_lock:{machine_id}"):
        stmt = sql.select(models.Machines).filter(models.Machines.id == machine_id)
        machine = (
            await db.execute(ctx.team_filter(stmt, models.Machines))
        ).scalar_one_or_none()
        try:
            agent_res = await ansible_service.run_playbook_task(
                PLAYBOOK_MAP[service_schemas.AnsiblePlaybook.delete_agent],
                machine.name,
                request.extra_vars,
            )
            meta_res = await db.execute(
                sql.select(models.Metadata).where(
                    models.Metadata.id == machine.metadata_id
                )
            )
            meta = meta_res.scalar_one_or_none()
            if meta:
                meta.agent_prometheus = False
                meta.last_update = datetime.now()

            await db.commit()
            return {
                "message": f"Agent removed from {machine.name}",
                "agent_result": agent_res,
            }
        except Exception as e:
            await db.rollback()
            raise exceptions.ExternalServiceError(
                f"Agent Removal for {machine.name} failed"
            ) from e
