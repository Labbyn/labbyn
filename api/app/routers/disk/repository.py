from typing import Any, Sequence
from sqlalchemy import sql, orm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models

class DiskRepository:
    """Repository for handling Disk database operations."""

    @staticmethod
    async def get_all(db: AsyncSession, ctx) -> Sequence[Any]:
        """Fetch all Disks visible to the user's teams.

        :param db: Active asynchronous database session.
        :param ctx: Request context containing user and team filtering logic.
        :return: List of Disk model instances.
        """
        stmt = sql.select(models.Disks).join(models.Machines)
        stmt = ctx.team_filter(stmt, models.Machines)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, disk_id: int, ctx) -> models.Disks:
        """Fetch a specific Disk by ID with team access validation.

        :param db: Active asynchronous database session.
        :param disk_id: The primary key ID of the disk.
        :param ctx: Request context containing user and team filtering logic.
        :return: Disk model instance or None if not found or access denied.
        """
        stmt = (
            sql.select(models.Disks)
            .options(orm.selectinload(models.Disks.machine))
            .join(models.Machines)
            .where(models.Disks.id == disk_id)
        )
        stmt = ctx.team_filter(stmt, models.Machines)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_machine_for_disk(db: AsyncSession, machine_id: int, ctx) -> models.Machines:
        """Verify if the target machine exists and is accessible to the user.

        :param db: Active asynchronous database session.
        :param machine_id: The primary key ID of the target machine.
        :param ctx: Request context containing user and team filtering logic.
        :return: Machine model instance or None if not found or access denied.
        """
        stmt = sql.select(models.Machines).where(models.Machines.id == machine_id)
        stmt = ctx.team_filter(stmt, models.Machines)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()