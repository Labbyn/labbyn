from typing import List, Optional
from sqlalchemy import sql, orm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models


class RackRepository:
    """Repository for handling Rack database operations."""

    @staticmethod
    async def get_all(
        db: AsyncSession,
        ctx,
        room_ids: Optional[List[int]] = None,
        team_ids: Optional[List[int]] = None,
    ) -> List[models.Rack]:
        """Fetch all racks with filtering and eager loading.

        :param db: Active database session.
        :param ctx: Request context for team filtering.
        :param room_ids: Optional list of room IDs.
        :param team_ids: Optional list of team IDs.
        :return: List of Rack objects.
        """
        stmt = sql.select(models.Rack)
        stmt = ctx.team_filter(stmt, models.Rack)

        if room_ids:
            stmt = stmt.where(models.Rack.room_id.in_(room_ids))
        if team_ids:
            stmt = stmt.where(models.Rack.team_id.in_(team_ids))

        stmt = stmt.options(
            orm.joinedload(models.Rack.room),
            orm.joinedload(models.Rack.team),
            orm.joinedload(models.Rack.tags),
            orm.joinedload(models.Rack.shelves).joinedload(models.Shelf.machines),
        )

        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, rack_id: int, ctx, detailed: bool = False
    ) -> Optional[models.Rack]:
        """Fetch specific rack by ID.

        :param db: Active database session.
        :param rack_id: ID of the rack.
        :param ctx: Request context.
        :param detailed: Whether to load shelves and machines.
        :return: Rack object or None.
        """
        stmt = sql.select(models.Rack).where(models.Rack.id == rack_id)
        stmt = ctx.team_filter(stmt, models.Rack)

        if detailed:
            stmt = stmt.options(
                orm.joinedload(models.Rack.room),
                orm.joinedload(models.Rack.team),
                orm.joinedload(models.Rack.tags),
                orm.joinedload(models.Rack.shelves).joinedload(models.Shelf.machines),
            )
        else:
            stmt = stmt.options(
                orm.joinedload(models.Rack.room),
                orm.joinedload(models.Rack.team),
            )

        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()
