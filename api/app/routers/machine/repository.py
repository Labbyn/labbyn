import os
from typing import List

from sqlalchemy import orm, sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models

GRAFANA_URL = (
    "http://localhost:3001"
    if os.environ.get("ENV") == "development"
    else "http://localhost/grafana"
)


class MachineRepository:
    """Repository for handling Machine database operations."""

    @staticmethod
    async def get_all(db: AsyncSession, ctx) -> List[models.Machines]:
        """Fetch all machines.

        :param db: Active database session
        :param ctx: Request context for user and team info
        :return: List of machines.
        """
        stmt = sql.select(models.Machines).options(
            orm.joinedload(models.Machines.cpus),
            orm.joinedload(models.Machines.disks),
            orm.joinedload(models.Machines.team),
            orm.joinedload(models.Machines.machine_metadata),
            orm.joinedload(models.Machines.room),
        )
        stmt = ctx.team_filter(stmt, models.Machines)
        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, machine_id: int, ctx, full_detail: bool = False
    ) -> models.Machines:
        """Fetch specific machine by ID.

        :param machine_id: Machine ID
        :param db: Active database session
        :param ctx: Request context for user and team info
        :return: Machine object or None.
        """
        stmt = sql.select(models.Machines).filter(models.Machines.id == machine_id)

        if full_detail:
            stmt = stmt.options(
                orm.joinedload(models.Machines.team),
                orm.joinedload(models.Machines.room),
                orm.joinedload(models.Machines.machine_metadata),
                orm.joinedload(models.Machines.tags),
                orm.joinedload(models.Machines.cpus),
                orm.joinedload(models.Machines.disks),
                orm.joinedload(models.Machines.shelf).joinedload(models.Shelf.rack),
            )
        else:
            stmt = stmt.options(
                orm.joinedload(models.Machines.cpus),
                orm.joinedload(models.Machines.disks),
                orm.joinedload(models.Machines.team),
                orm.joinedload(models.Machines.machine_metadata),
            )

        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()

    @staticmethod
    async def get_shelf_with_rack(db: AsyncSession, shelf_id: int) -> models.Shelf:
        """Fetch specific shelf with rack by ID.

        :param shelf_id: shelf ID
        :param db: Active database session
        :return: Shelf object or None.
        """
        stmt = (
            sql.select(models.Shelf)
            .filter(models.Shelf.id == shelf_id)
            .options(orm.joinedload(models.Shelf.rack))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
