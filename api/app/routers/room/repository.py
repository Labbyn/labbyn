from typing import Any, List, Optional, Sequence

from sqlalchemy import orm, sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models


class RoomRepository:
    """Repository for handling Room database operations."""

    @staticmethod
    async def get_all(db: AsyncSession, ctx) -> List[models.Rooms]:
        """Fetch all rooms with team filtering.

        :param db: Active database session.
        :param ctx: Request context for team filtering.
        :return: List of Room objects.
        """
        stmt = sql.select(models.Rooms).options(orm.joinedload(models.Rooms.tags))
        stmt = ctx.team_filter(stmt, models.Rooms)
        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, room_id: int, ctx, detailed: bool = False
    ) -> Optional[models.Rooms]:
        """Fetch specific room by ID with optional detailed loading.

        :param db: Active database session.
        :param room_id: ID of the room.
        :param ctx: Request context.
        :param detailed: Whether to load racks, shelves, machines and maps.
        :return: Room object or None.
        """
        stmt = sql.select(models.Rooms).filter(models.Rooms.id == room_id)
        stmt = stmt.options(orm.joinedload(models.Rooms.tags))

        if detailed:
            stmt = stmt.options(
                orm.joinedload(models.Rooms.tags),
                orm.joinedload(models.Rooms.map),
                orm.joinedload(models.Rooms.racks).joinedload(models.Rack.tags),
                orm.joinedload(models.Rooms.racks)
                .joinedload(models.Rack.shelves)
                .joinedload(models.Shelf.machines),
            )

        stmt = ctx.team_filter(stmt, models.Rooms)
        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()

    @staticmethod
    async def get_dashboard_data(db: AsyncSession, ctx) -> Sequence[Any]:
        """Fetch rooms with rack counts and map info for dashboard.

        :param db: Active database session.
        :param ctx: Request context.
        :return: List of rooms with joined relations.
        """
        stmt = sql.select(models.Rooms).options(
            orm.joinedload(models.Rooms.racks),
            orm.joinedload(models.Rooms.map),
            orm.joinedload(models.Rooms.team),
            orm.joinedload(models.Rooms.tags),
        )
        stmt = ctx.team_filter(stmt, models.Rooms)
        result = await db.execute(stmt)
        return result.unique().scalars().all()
