from typing import Optional, Any, Sequence
from sqlalchemy import sql, orm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models


class ShelfRepository:
    """Repository for handling Shelf database operations."""

    @staticmethod
    async def get_by_rack(db: AsyncSession, rack_id: int) -> Sequence[Any]:
        """Fetch all shelves for a specific rack ordered by position.

        :param db: Active database session.
        :param rack_id: ID of the parent rack.
        :return: List of Shelf objects.
        """
        stmt = (
            sql.select(models.Shelf)
            .options(orm.joinedload(models.Shelf.machines))
            .filter(models.Shelf.rack_id == rack_id)
            .order_by(models.Shelf.order.desc())
        )
        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, shelf_id: int) -> Optional[models.Shelf]:
        """Fetch specific shelf by ID with machines loaded.

        :param db: Active database session.
        :param shelf_id: ID of the shelf.
        :return: Shelf object or None.
        """
        stmt = (
            sql.select(models.Shelf)
            .options(orm.joinedload(models.Shelf.machines))
            .filter(models.Shelf.id == shelf_id)
        )
        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()
