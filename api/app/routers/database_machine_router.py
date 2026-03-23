"""Router for Machine Database API CRUD."""

import json
import os
from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import sql, orm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import machine_schemas
from app.utils import redis_service

router = APIRouter(prefix="/db", tags=["Machines"])

if os.environ.get("ENV") == "development":
    GRAFANA_URL = "http://localhost:3001"
else:
    GRAFANA_URL = "http://grafana:3000"


@router.post(
    "/machines/",
    response_model=machine_schemas.MachinesResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_machine(
    machine_data: machine_schemas.MachinesCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create and add new machine to database.

    :param machine_data: Machine data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Machine object.
    """
    ctx.require_user()
    cpus = machine_data.cpus or []
    disks = machine_data.disks or []
    data = machine_data.model_dump(exclude={"cpus", "disks"})
    await ctx.validate_team_access(data["team_id"])
    try:
        if not data.get("metadata_id"):
            new_metadata = models.Metadata()
            db.add(new_metadata)
            await db.flush()
            data["metadata_id"] = new_metadata.id

        obj = models.Machines(**data)
        obj.cpus = [models.CPUs(name=item.name) for item in cpus]
        obj.disks = [models.Disks(name=item.name) for item in disks]

        db.add(obj)
        await db.commit()
        await db.refresh(
            obj,
            attribute_names=[
                "team",
                "room",
                "machine_metadata",
                "shelf",
                "cpus",
                "disks",
            ],
        )
        return obj
    except IntegrityError:
        await db.rollback()
        raise exceptions.ConflictError(
            message=f"Machine with name '{machine_data.name}' already exists in this room."
        )
    except Exception as e:
        await db.rollback()
        raise exceptions.ValidationError(
            f"Failed to create machine '{machine_data.name}'"
        ) from e


@router.get("/machines/", response_model=List[machine_schemas.MachinesResponse])
async def get_machines(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all machines.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of machines.
    """
    ctx.require_user()
    stmt = sql.select(models.Machines).options(
        orm.joinedload(models.Machines.cpus),
        orm.joinedload(models.Machines.disks),
        orm.joinedload(models.Machines.team),
        orm.joinedload(models.Machines.machine_metadata),
    )
    stmt = ctx.team_filter(stmt, models.Machines)
    result = await db.execute(stmt)
    return result.unique().scalars().all()


@router.get("/machines/{machine_id}", response_model=machine_schemas.MachinesResponse)
async def get_machine_by_id(
    machine_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific machine by ID.

    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Machine object.
    """
    ctx.require_user()
    stmt = (
        sql.select(models.Machines)
        .options(
            orm.joinedload(models.Machines.cpus),
            orm.joinedload(models.Machines.disks),
            orm.joinedload(models.Machines.team),
            orm.joinedload(models.Machines.machine_metadata),
        )
        .filter(models.Machines.id == machine_id)
    )
    stmt = ctx.team_filter(stmt, models.Machines)
    result = await db.execute(stmt)
    machine = result.unique().scalar_one_or_none()

    if not machine:
        raise exceptions.ObjectNotFoundError("Machine")
    return machine


@router.get(
    "/machines/{machine_id}/full",
    response_model=machine_schemas.MachineFullDetailResponse,
)
async def get_machine_full_detail(
    machine_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific machine by ID.

    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Machine object.
    """
    ctx.require_user()
    stmt = sql.select(models.Machines).filter(models.Machines.id == machine_id)
    stmt = ctx.team_filter(stmt, models.Machines)

    stmt = stmt.options(
        orm.joinedload(models.Machines.team),
        orm.joinedload(models.Machines.room),
        orm.joinedload(models.Machines.machine_metadata),
        orm.joinedload(models.Machines.tags),
        orm.joinedload(models.Machines.cpus),
        orm.joinedload(models.Machines.disks),
        orm.joinedload(models.Machines.shelf).joinedload(models.Shelf.rack),
    )

    result = await db.execute(stmt)
    machine = result.unique().scalar_one_or_none()

    if not machine:
        raise exceptions.ObjectNotFoundError("Machine")

    status_data = await redis_service.get_cache("prometheus_metrics_cache")
    metrics_data = await redis_service.get_cache("prometheus_other_metrics_cache")

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

    grafana_link = f"{GRAFANA_URL}/d/ARCDarkvk/?orgId=1&var-host={target_ip}"
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
        "team_id": machine.team_id,
        "team_name": machine.team.name if machine.team else "N/A",
        "rack_id": (
            machine.shelf.rack_id if (machine.shelf and machine.shelf.rack) else None
        ),
        "rack_name": (
            machine.shelf.rack.name if (machine.shelf and machine.shelf.rack) else "N/A"
        ),
        "shelf_id": machine.shelf.id if machine.shelf else 0,
        "shelf_number": machine.shelf.order if machine.shelf else 0,
        "room_name": machine.room.name if machine.room else "N/A",
        "room_id": machine.room.id if machine.room else None,
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


@router.patch("/machines/{machine_id}", response_model=machine_schemas.MachinesResponse)
async def update_machine(
    machine_id: int,
    machine_data: machine_schemas.MachinesUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update machine data.

    :param machine_id: Machine ID
    :param machine_data: Machine data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Machine.
    """
    ctx.require_user()
    async with redis_service.acquire_lock(f"machine_lock:{machine_id}"):
        stmt = sql.select(models.Machines).filter(models.Machines.id == machine_id)
        stmt = ctx.team_filter(stmt, models.Machines)
        result = await db.execute(stmt)
        machine = result.scalar_one_or_none()

        if not machine:
            raise exceptions.ObjectNotFoundError("Machine")

        update_data = machine_data.model_dump(exclude_unset=True)
        if "shelf_id" in update_data and (
            update_data["shelf_id"] == 0 or update_data["shelf_id"] == ""
        ):
            update_data["shelf_id"] = None
        if "team_id" in update_data and not ctx.is_admin:
            await ctx.validate_team_access(update_data["team_id"])

        if "cpus" in update_data:
            updated_cpus = update_data.pop("cpus")
            updated_cpus_ids = [c.get("id") for c in updated_cpus if c.get("id")]

            del_stmt = sql.delete(models.CPUs).where(
                models.CPUs.machine_id == machine_id
            )
            if updated_cpus_ids:
                del_stmt = del_stmt.where(models.CPUs.id.not_in(updated_cpus_ids))
            await db.execute(del_stmt)

            for cpu_item in updated_cpus:
                if not cpu_item.get("id"):
                    db.add(models.CPUs(name=cpu_item["name"], machine_id=machine_id))
                else:
                    await db.execute(
                        sql.update(models.CPUs)
                        .where(models.CPUs.id == cpu_item["id"])
                        .values(name=cpu_item["name"])
                    )

        if "disks" in update_data:
            updated_disks = update_data.pop("disks")
            updated_disks_ids = [d.get("id") for d in updated_disks if d.get("id")]

            del_disk_stmt = sql.delete(models.Disks).where(
                models.Disks.machine_id == machine_id
            )
            if updated_disks_ids:
                del_disk_stmt = del_disk_stmt.where(
                    models.Disks.id.not_in(updated_disks_ids)
                )
            await db.execute(del_disk_stmt)

            for disk_item in updated_disks:
                if not disk_item.get("id"):
                    db.add(
                        models.Disks(
                            name=disk_item["name"],
                            capacity=disk_item["capacity"],
                            machine_id=machine_id,
                        )
                    )
                else:
                    await db.execute(
                        sql.update(models.Disks)
                        .where(models.Disks.id == disk_item["id"])
                        .values(name=disk_item["name"], capacity=disk_item["capacity"])
                    )

        for k, v in update_data.items():
            setattr(machine, k, v)

        try:
            await db.commit()

        except IntegrityError:
            await db.rollback()
            raise exceptions.ConflictError(
                message=f"Conflict: Machine name '{machine.name}' is already taken in the target room."
            )

        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Failed to update machine '{machine.name}'"
            ) from e

        await db.refresh(
            machine,
            attribute_names=["team", "machine_metadata", "shelf", "cpus", "disks"],
        )
        return machine


@router.delete(
    "/machines/{machine_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_machine(
    machine_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete Machine.

    :param machine_id: Machine ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None.
    """
    ctx.require_user()
    async with redis_service.acquire_lock(f"machine_lock:{machine_id}"):
        stmt = sql.select(models.Machines).filter(models.Machines.id == machine_id)
        stmt = ctx.team_filter(stmt, models.Machines)
        result = await db.execute(stmt)
        machine = result.scalar_one_or_none()

        if not machine:
            raise exceptions.ObjectNotFoundError("Machine")
        try:
            await db.delete(machine)
            await db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Could not delete machine '{machine.name}'"
            ) from e


@router.post("/machines/{machine_id}/mount/{shelf_id}", status_code=status.HTTP_200_OK)
async def mount_machine(
    machine_id: int,
    shelf_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Mounts a machine onto a specific shelf.

    :param machine_id: ID of the machine to mount
    :param shelf_id: ID of the target shelf
    :param db: Active database session
    :param ctx: Request context for authorization
    :return: Status message.
    """
    ctx.require_user()
    async with redis_service.acquire_lock(f"machine_lock:{machine_id}"):
        machine_stmt = sql.select(models.Machines).filter(
            models.Machines.id == machine_id
        )
        machine_stmt = ctx.team_filter(machine_stmt, models.Machines)
        machine_res = await db.execute(machine_stmt)
        machine = machine_res.scalar_one_or_none()

        if not machine:
            raise exceptions.ObjectNotFoundError("Machine")

        shelf_stmt = (
            sql.select(models.Shelf)
            .filter(models.Shelf.id == shelf_id)
            .options(orm.joinedload(models.Shelf.rack))
        )
        shelf_res = await db.execute(shelf_stmt)
        shelf = shelf_res.scalar_one_or_none()

        if not shelf:
            raise exceptions.ObjectNotFoundError("Target shelf")

        await ctx.validate_team_access(shelf.rack.team_id)

        try:
            m_name = machine.name
            s_name = shelf.name
            r_name = shelf.rack.name

            machine.shelf_id = shelf_id
            machine.localization_id = shelf.rack.room_id

            await db.commit()

            return {
                "status": "success",
                "message": f"Machine {m_name} mounted on "
                f"shelf {s_name} (Rack: {r_name})",
            }
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Failed to mount machine '{machine.name} on "
                f"shelf {s_name} (Rack: {r_name})'"
            ) from e


@router.post("/machines/{machine_id}/unmount", status_code=status.HTTP_200_OK)
async def unmount_machine(
    machine_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Removes a machine from its current shelf (sets shelf_id to NULL).

    :param machine_id: ID of the machine to unmount
    :param db: Active database session
    :param ctx: Request context for team-based access control
    :return: Status message.
    """
    ctx.require_user()

    stmt = (
        sql.select(models.Machines)
        .filter(models.Machines.id == machine_id)
        .options(orm.joinedload(models.Machines.shelf).joinedload(models.Shelf.rack))
    )
    stmt = ctx.team_filter(stmt, models.Machines)
    result = await db.execute(stmt)
    machine = result.scalar_one_or_none()

    if not machine:
        raise exceptions.ObjectNotFoundError("Machine")

    try:
        info = (
            f"Machine {machine.name} unmounted from shelf {machine.shelf.name} "
            f"(Rack: {machine.shelf.rack.name})"
            if machine.shelf
            else f"Machine {machine.name} unmounted"
        )

        machine.shelf_id = None

        await db.commit()
        return {"status": "success", "message": info}

    except Exception as e:
        await db.rollback()
        raise exceptions.ValidationError(
            f"Failed to unmount machine '{machine.name}'"
        ) from e
