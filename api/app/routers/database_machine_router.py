"""Router for Machine Database API CRUD."""

import json
from typing import List

from app.database import get_async_db
from app.db.models import Machines, User, UserType, Rack, Shelf, CPUs, Disks, Metadata
from app.db.schemas import (
    MachinesCreate,
    MachinesResponse,
    MachinesUpdate,
    MachineFullDetailResponse,
)
from app.utils.redis_service import acquire_lock, get_cache
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.utils.database_service import resolve_target_team_id

router = APIRouter()


@router.post(
    "/db/machines/",
    response_model=MachinesResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Machines"],
)
async def create_machine(
    machine_data: MachinesCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Create and add new machine to database
    :param machine_data: Machine data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Machine object
    """
    ctx.require_user()
    cpus = machine_data.cpus or []
    disks = machine_data.disks or []
    data = machine_data.model_dump(exclude={"cpus", "disks"})
    data["team_id"] = resolve_target_team_id(ctx, data.get("team_id"))

    if not data.get("metadata_id"):
        new_metadata = Metadata()
        db.add(new_metadata)
        await db.flush()
        data["metadata_id"] = new_metadata.id

    obj = Machines(**data)
    obj.cpus = [CPUs(name=item.name) for item in cpus]
    obj.disks = [Disks(name=item.name) for item in disks]

    db.add(obj)
    await db.commit()
    await db.refresh(
        obj,
        attribute_names=["team", "room", "machine_metadata", "shelf", "cpus", "disks"],
    )
    return obj


@router.get("/db/machines/", response_model=List[MachinesResponse], tags=["Machines"])
async def get_machines(
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch all machines
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of machines
    """
    ctx.require_user()
    stmt = select(Machines)
    stmt = ctx.team_filter(stmt, Machines)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get(
    "/db/machines/{machine_id}", response_model=MachinesResponse, tags=["Machines"]
)
async def get_machine_by_id(
    machine_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch specific machine by ID
    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Machine object
    """
    ctx.require_user()
    stmt = select(Machines).filter(Machines.id == machine_id)
    stmt = ctx.team_filter(stmt, Machines)
    result = await db.execute(stmt)
    machine = result.scalar_one_or_none()

    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found or access denied",
        )
    return machine


@router.get(
    "/db/machines/{machine_id}/full",
    response_model=MachineFullDetailResponse,
    tags=["Machines"],
)
async def get_machine_full_detail(
    machine_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch specific machine by ID
    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Machine object
    """

    ctx.require_user()
    stmt = select(Machines).filter(Machines.id == machine_id)
    stmt = ctx.team_filter(stmt, Machines)

    stmt = stmt.options(
        joinedload(Machines.team),
        joinedload(Machines.room),
        joinedload(Machines.machine_metadata),
        joinedload(Machines.tags),
        joinedload(Machines.cpus),
        joinedload(Machines.disks),
        joinedload(Machines.shelf).joinedload(Shelf.rack),
    )

    result = await db.execute(stmt)
    machine = result.unique().scalar_one_or_none()

    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    status_data = await get_cache("prometheus_metrics_cache")
    metrics_data = await get_cache("prometheus_other_metrics_cache")

    status_parsed = json.loads(status_data) if status_data else {}
    metrics_parsed = json.loads(metrics_data) if metrics_data else {}

    target_ip = machine.ip_address if machine.ip_address else machine.name
    net_status = "Offline"
    live_payload = {"cpu_usage": None, "ram_usage": None}

    if status_parsed:
        for s in status_parsed.get("status", []):
            if target_ip in s["instance"] and s["value"] == 1.0:
                net_status = "Online"
                break

    if metrics_parsed:
        live_payload["cpu_usage"] = next(
            (
                m["value"]
                for m in metrics_parsed.get("cpu_usage", [])
                if target_ip in m["instance"]
            ),
            None,
        )
        live_payload["ram_usage"] = next(
            (
                m["value"]
                for m in metrics_parsed.get("memory_usage", [])
                if target_ip in m["instance"]
            ),
            None,
        )
        disks_stats = [
            {
                "mountpoint": m.get("mountpoint", "/"),
                "value": round(m["value"], 2) if m["value"] is not None else None,
                "timestamp": m["timestamp"],
            }
            for m in metrics_parsed.get("disk_usage", [])
            if target_ip in m["instance"]
        ]
        live_payload["disks"] = disks_stats

    grafana_link = f"http://grafana.{target_ip}:9100"
    rack_link = f"/racks/{machine.shelf.rack_id}" if machine.shelf else "#"
    map_link = "/map/view"

    return {
        "id": machine.id,
        "name": machine.name,
        "ip_address": machine.ip_address,
        "mac_address": machine.mac_address,
        "os": machine.os,
        "cpus": machine.cpus,
        "ram": machine.ram,
        "disks": machine.disks,
        "serial_number": machine.serial_number,
        "note": machine.note,
        "pdu_port": machine.pdu_port,
        "added_on": machine.added_on,
        "team_name": machine.team.name if machine.team else "N/A",
        "rack_name": (
            machine.shelf.rack.name if (machine.shelf and machine.shelf.rack) else "N/A"
        ),
        "shelf_number": machine.shelf.order if machine.shelf else "N/A",
        "room_name": machine.room.name if machine.room else "N/A",
        "last_update": machine.machine_metadata.last_update,
        "monitoring": machine.machine_metadata.agent_prometheus,
        "ansible_access": machine.machine_metadata.ansible_access,
        "ansible_root_access": machine.machine_metadata.ansible_root_access,
        "tags": machine.tags,
        "network_status": net_status,
        "prometheus_live_stats": live_payload,
        "grafana_link": grafana_link,
        "rack_link": rack_link,
        "map_link": map_link,
    }


@router.patch(
    "/db/machines/{machine_id}", response_model=MachinesResponse, tags=["Machines"]
)
async def update_machine(
    machine_id: int,
    machine_data: MachinesUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Update machine data
    :param machine_id: Machine ID
    :param machine_data: Machine data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Machine
    """
    ctx.require_user()
    async with acquire_lock(f"machine_lock:{machine_id}"):
        stmt = select(Machines).filter(Machines.id == machine_id)
        stmt = ctx.team_filter(stmt, Machines)
        result = await db.execute(stmt)
        machine = result.scalar_one_or_none()

        if not machine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Machine not found or access denied",
            )

        update_data = machine_data.model_dump(exclude_unset=True)
        if "team_id" in update_data and not ctx.is_admin:
            if update_data["team_id"] not in ctx.team_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to assign this machine to the specified team",
                )
        for k, v in update_data.items():
            setattr(machine, k, v)

        await db.commit()
        await db.refresh(
            machine,
            attribute_names=[
                "team",
                "localization",
                "metadata",
                "shelf",
                "cpus",
                "disks",
            ],
        )
        return machine


@router.delete(
    "/db/machines/{machine_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Machines"],
)
async def delete_machine(
    machine_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Delete Machine
    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    ctx.require_user()
    async with acquire_lock(f"machine_lock:{machine_id}"):
        stmt = select(Machines).filter(Machines.id == machine_id)
        stmt = ctx.team_filter(stmt, Machines)
        result = await db.execute(stmt)
        machine = result.scalar_one_or_none()

        if not machine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Machine not found or access denied",
            )
        await db.delete(machine)
        await db.commit()


@router.post(
    "/db/machines/{machine_id}/mount/{shelf_id}", status_code=status.HTTP_200_OK
)
async def mount_machine(
    machine_id: int,
    shelf_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Mounts a machine onto a specific shelf
    :param machine_id: ID of the machine to mount
    :param shelf_id: ID of the target shelf
    :param db: Active database session
    :param ctx: Request context for authorization
    :return: Status message
    """
    ctx.require_user()
    async with acquire_lock(f"machine_lock:{machine_id}"):
        machine_stmt = select(Machines).filter(Machines.id == machine_id)
        machine_stmt = ctx.team_filter(machine_stmt, Machines)
        machine_res = await db.execute(machine_stmt)
        machine = machine_res.scalar_one_or_none()

        if not machine:
            raise HTTPException(
                status_code=404, detail="Machine not found or access denied"
            )

        shelf_stmt = (
            select(Shelf).filter(Shelf.id == shelf_id).options(joinedload(Shelf.rack))
        )
        shelf_res = await db.execute(shelf_stmt)
        shelf = shelf_res.scalar_one_or_none()

        if not shelf:
            raise HTTPException(status_code=404, detail="Target shelf not found")

        if not ctx.is_admin:
            if shelf.rack.team_id not in ctx.team_ids:
                raise HTTPException(
                    status_code=403,
                    detail="You don't have permission to use this rack/shelf",
                )

        machine.shelf_id = shelf_id
        machine.localization_id = shelf.rack.room_id

        await db.commit()
        return {
            "status": "success",
            "message": f"Machine {machine.name} mounted on shelf {shelf.name} (Rack: {shelf.rack.name})",
        }


@router.post("/db/machines/{machine_id}/unmount", status_code=status.HTTP_200_OK)
async def unmount_machine(
    machine_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Removes a machine from its current shelf (sets shelf_id to NULL)
    :param machine_id: ID of the machine to unmount
    :param db: Active database session
    :param ctx: Request context for team-based access control
    :return: Status message
    """
    ctx.require_user()

    stmt = select(Machines).filter(Machines.id == machine_id)
    stmt = ctx.team_filter(stmt, Machines)
    result = await db.execute(stmt)
    machine = result.scalar_one_or_none()

    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Machine not found or access denied",
        )

    machine.shelf_id = None

    await db.commit()
    return {
        "status": "success",
        "message": f"Machine {machine.name} has been unmounted.",
    }
