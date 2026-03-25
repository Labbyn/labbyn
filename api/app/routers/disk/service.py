from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service
from .repository import DiskRepository


class DiskService:
    """Service for managing Disk storage units and their machine assignments."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Disk Service.

        Args:
            db (AsyncSession): Active database session.
            ctx (RequestContext): User request context for security and filtering.
        """
        self.db = db
        self.ctx = ctx
        self.repo = DiskRepository()

    async def get_disk_or_404(self, disk_id: int) -> models.Disks:
        """Internal helper to fetch Disk or raise 404.

        :param disk_id: Unique ID of the disk.
        :return: Disk model instance.
        :raises ObjectNotFoundError: If disk is not found or access is denied.
        """
        self.ctx.require_user()
        disk = await self.repo.get_by_id(self.db, disk_id, self.ctx)
        if not disk:
            raise exceptions.ObjectNotFoundError("Disk")
        return disk

    async def create_disk(self, disk_data):
        """Create new Disk and attach it to a machine.

        :param disk_data: Disk creation schema (Pydantic model).
        :return: Newly created Disk model instance.
        :raises AccessDeniedError: If non-admin tries to create a floating disk.
        :raises ObjectNotFoundError: If target machine does not exist.
        """
        self.ctx.require_user()

        if not self.ctx.is_admin and not getattr(disk_data, "machine_id", None):
            raise exceptions.AccessDeniedError(
                "Non-admin users must attach disks to a specific machine."
            )

        machine = await self.repo.get_machine_for_disk(
            self.db, disk_data.machine_id, self.ctx
        )
        if not machine:
            raise exceptions.ObjectNotFoundError("Machine for this disk")

        try:
            obj = models.Disks(**disk_data.model_dump())
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Failed to add disk '{disk_data.name}' to machine '{machine.name}'"
            ) from e

    async def update_disk(self, disk_id: int, disk_data):
        """Update disk data with record locking.

        :param disk_id: Unique ID of the disk to update.
        :param disk_data: Schema containing fields to be updated.
        :return: Updated Disk model instance.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"disk_lock:{disk_id}"):
            disk = await self.get_disk_or_404(disk_id)
            try:
                for k, v in disk_data.model_dump(exclude_unset=True).items():
                    setattr(disk, k, v)
                await self.db.commit()
                await self.db.refresh(disk)
                return disk
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Update failed for disk '{disk.name}'"
                ) from e

    async def delete_disk(self, disk_id: int):
        """Delete disk unit from a machine.

        :param disk_id: Unique ID of the disk to delete.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"disk_lock:{disk_id}"):
            disk = await self.get_disk_or_404(disk_id)
            try:
                await self.db.delete(disk)
                await self.db.commit()
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Could not delete disk '{disk.name}'"
                ) from e
