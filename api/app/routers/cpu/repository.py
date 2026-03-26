from typing import List

from sqlalchemy import orm, sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models


class CPURepository:
    """Repository for handling CPU database operations."""

    @staticmethod
    async def get_all(db: AsyncSession, ctx) -> List[models.CPUs]:
        """Fetch all CPUs visible to the user's teams.

        :param db: Active asynchronous database session.
        :param ctx: Request context containing user and team filtering logic.
        :return: List of CPU model instances accessible to the current user.
        """
        stmt = sql.select(models.CPUs).join(models.Machines)
        stmt = ctx.team_filter(stmt, models.Machines)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, cpu_id: int, ctx) -> models.CPUs:
        """Fetch a specific CPU by ID.

        :param db: Active asynchronous database session.
        :param cpu_id: The primary key ID of the CPU.
        :param ctx: Request context containing user and team filtering logic.
        :return: CPU model instance or None if not found or access denied.
        """
        stmt = (
            sql.select(models.CPUs)
            .options(orm.selectinload(models.CPUs.machine))
            .join(models.Machines)
            .where(models.CPUs.id == cpu_id)
        )
        stmt = ctx.team_filter(stmt, models.Machines)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_machine_for_cpu(
        db: AsyncSession, machine_id: int, ctx
    ) -> models.Machines:
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
