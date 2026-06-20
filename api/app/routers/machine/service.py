import json
from typing import Any, Dict

from sqlalchemy import sql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service

from .repository import GRAFANA_URL, MachineRepository


class MachineService:
    """Service for managing Machines, metrics integration, and mounting logic."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Machine Service.

        :param db: Active database session.
        :param ctx: User context.
        """
        self.db = db
        self.ctx = ctx
        self.repo = MachineRepository()

    async def get_machine_or_404(
        self, machine_id: int, full_detail: bool = False
    ) -> models.Machines:
        """Fetch specific machine by ID or raise 404.

        :param machine_id: Unique ID of the machine.
        :param full_detail: Boolean flag to trigger eager loading of all relations.
        :return: Machine model object.
        :raises ObjectNotFoundError: If the machine does not exist or access is denied.
        """
        self.ctx.require_user()
        machine = await self.repo.get_by_id(
            self.db, machine_id, self.ctx, full_detail=full_detail
        )
        if not machine:
            raise exceptions.ObjectNotFoundError("Machine")
        await self.ctx.validate_team_access(machine, resource_name="Machine")
        return machine

    async def create_machine(self, machine_data: Any) -> models.Machines:
        """Create and add new machine to database.

        :param machine_data: Pydantic schema containing machine, CPU, and disk data.
        :return: Newly created Machine model object.
        :raises ConflictError: If machine name already exists in the room.
        :raises ValidationError: If database operation fails.
        """
        self.ctx.require_user()
        cpus = machine_data.cpus or []
        disks = machine_data.disks or []
        data = machine_data.model_dump(exclude={"cpus", "disks"})
        await self.ctx.validate_team_access(data["team_id"], resource_name="Machine")
        try:
            if not data.get("metadata_id"):
                new_metadata = models.Metadata()
                self.db.add(new_metadata)
                await self.db.flush()
                data["metadata_id"] = new_metadata.id

            obj = models.Machines(**data)
            obj.cpus = [models.CPUs(name=item.name) for item in cpus]
            obj.disks = [models.Disks(name=item.name) for item in disks]

            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(
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
            await self.db.rollback()
            raise exceptions.ConflictError(
                message=f"Machine with name '{machine_data.name}' already exists in this room."
            )
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Failed to create machine '{machine_data.name}'"
            ) from e

    async def get_full_detail(self, machine_id: int) -> Dict[str, Any]:
        """Fetch specific machine by ID with live metrics from Redis/Prometheus.

        :param machine_id: Unique ID of the machine.
        :return: Dictionary containing machine details and live status/usage metrics.
        :raises ObjectNotFoundError: If machine is not found.
        """
        self.ctx.require_user()
        machine = await self.get_machine_or_404(machine_id, full_detail=True)

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
                machine.shelf.rack_id
                if (machine.shelf and machine.shelf.rack)
                else None
            ),
            "rack_name": (
                machine.shelf.rack.name
                if (machine.shelf and machine.shelf.rack)
                else "N/A"
            ),
            "shelf_id": machine.shelf.id if machine.shelf else 0,
            "shelf_number": machine.shelf.order if machine.shelf else 0,
            "shelf_name": machine.shelf.name if machine.shelf else "N/A",
            "room_name": machine.room.name if machine.room else "N/A",
            "room_id": machine.room.id if machine.room else None,
            "last_update": machine.machine_metadata.last_update,
            "monitoring": machine.machine_metadata.agent_prometheus,
            "ansible_access": machine.machine_metadata.ansible_access,
            "ansible_root_access": machine.machine_metadata.ansible_root_access,
            "tags": machine.tags,
            "network_status": net_status,
            "prometheus_live_stats": live_payload,
            "grafana_link": f"{GRAFANA_URL}/d/ARCDarkvk/?orgId=1&var-host={target_ip}",
            "rack_link": f"/racks/{machine.shelf.rack_id}" if machine.shelf else "#",
            "map_link": "/map/view",
        }

    async def update_machine(
        self, machine_id: int, machine_data: Any
    ) -> models.Machines:
        """Update machine data, managing CPU and Disk relations.

        :param machine_id: Unique ID of the machine to update.
        :param machine_data: Pydantic schema with updated fields.
        :return: Updated Machine model object.
        :raises ConflictError: If updated name conflicts with another machine.
        :raises ValidationError: If update fails.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"machine_lock:{machine_id}"):
            machine = await self.get_machine_or_404(machine_id)
            update_data = machine_data.model_dump(exclude_unset=True)

            if "shelf_id" in update_data and (
                update_data["shelf_id"] == 0 or update_data["shelf_id"] == ""
            ):
                update_data["shelf_id"] = None
            if "team_id" in update_data and not self.ctx.is_admin:
                await self.ctx.validate_team_access(update_data["team_id"])

            if "cpus" in update_data:
                updated_cpus = update_data.pop("cpus")
                updated_cpus_ids = [c.get("id") for c in updated_cpus if c.get("id")]
                await self.db.execute(
                    sql.delete(models.CPUs)
                    .where(models.CPUs.machine_id == machine_id)
                    .where(models.CPUs.id.not_in(updated_cpus_ids))
                    if updated_cpus_ids
                    else sql.delete(models.CPUs).where(
                        models.CPUs.machine_id == machine_id
                    )
                )
                for cpu_item in updated_cpus:
                    if not cpu_item.get("id"):
                        self.db.add(
                            models.CPUs(name=cpu_item["name"], machine_id=machine_id)
                        )
                    else:
                        await self.db.execute(
                            sql.update(models.CPUs)
                            .where(models.CPUs.id == cpu_item["id"])
                            .values(name=cpu_item["name"])
                        )

            if "disks" in update_data:
                updated_disks = update_data.pop("disks")
                updated_disks_ids = [d.get("id") for d in updated_disks if d.get("id")]
                await self.db.execute(
                    sql.delete(models.Disks)
                    .where(models.Disks.machine_id == machine_id)
                    .where(models.Disks.id.not_in(updated_disks_ids))
                    if updated_disks_ids
                    else sql.delete(models.Disks).where(
                        models.Disks.machine_id == machine_id
                    )
                )
                for disk_item in updated_disks:
                    if not disk_item.get("id"):
                        self.db.add(
                            models.Disks(
                                name=disk_item["name"],
                                capacity=disk_item["capacity"],
                                machine_id=machine_id,
                            )
                        )
                    else:
                        await self.db.execute(
                            sql.update(models.Disks)
                            .where(models.Disks.id == disk_item["id"])
                            .values(
                                name=disk_item["name"], capacity=disk_item["capacity"]
                            )
                        )

            for k, v in update_data.items():
                setattr(machine, k, v)
            try:
                await self.db.commit()
                await self.db.refresh(
                    machine,
                    attribute_names=[
                        "team",
                        "machine_metadata",
                        "shelf",
                        "cpus",
                        "disks",
                    ],
                )
                return machine
            except IntegrityError:
                await self.db.rollback()
                raise exceptions.ConflictError(
                    message=f"Conflict: Machine name '{machine.name}' already taken."
                )
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Failed to update machine '{machine.name}'"
                ) from e

    async def delete_machine(self, machine_id: int) -> None:
        """Delete Machine and its direct associations.

        :param machine_id: Unique ID of the machine to delete.
        :raises ValidationError: If deletion fails.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"machine_lock:{machine_id}"):
            machine = await self.get_machine_or_404(machine_id)
            try:
                await self.db.delete(machine)
                await self.db.commit()
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Could not delete machine '{machine.name}'"
                ) from e

    async def mount_machine(self, machine_id: int, shelf_id: int) -> Dict[str, str]:
        """Mounts a machine onto a specific shelf in a rack.

        :param machine_id: ID of the machine to mount.
        :param shelf_id: ID of the target shelf.
        :return: Success status and message.
        :raises ObjectNotFoundError: If shelf is not found.
        :raises ValidationError: If mounting process fails.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"machine_lock:{machine_id}"):
            machine = await self.get_machine_or_404(machine_id)
            from sqlalchemy import orm

            shelf_stmt = (
                sql.select(models.Shelf)
                .filter(models.Shelf.id == shelf_id)
                .options(orm.joinedload(models.Shelf.rack))
            )
            shelf_res = await self.db.execute(shelf_stmt)
            shelf = shelf_res.scalar_one_or_none()
            if not shelf:
                raise exceptions.ObjectNotFoundError("Target shelf")
            await self.ctx.validate_team_access(
                shelf.rack.team_id, resource_name="Shelf"
            )
            try:
                m_name, s_name, r_name = machine.name, shelf.name, shelf.rack.name
                machine.shelf_id, machine.localization_id = shelf_id, shelf.rack.room_id
                await self.db.commit()
                return {
                    "status": "success",
                    "message": f"Machine {m_name} mounted on shelf {s_name} (Rack: {r_name})",
                }
            except Exception:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Failed to mount machine '{machine.name}'"
                )

    async def unmount_machine(self, machine_id: int) -> Dict[str, str]:
        """Removes a machine from its current shelf.

        :param machine_id: ID of the machine to unmount.
        :return: Success status and message.
        :raises ValidationError: If unmounting fails.
        """
        self.ctx.require_user()
        machine = await self.get_machine_or_404(machine_id, full_detail=True)
        try:
            info = (
                f"Machine {machine.name} unmounted from shelf {machine.shelf.name}"
                if machine.shelf
                else f"Machine {machine.name} unmounted"
            )
            machine.shelf_id = None
            await self.db.commit()
            return {"status": "success", "message": info}
        except Exception:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Failed to unmount machine '{machine.name}'"
            )
