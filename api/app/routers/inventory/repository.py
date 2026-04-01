from typing import List

from sqlalchemy import orm, sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models


class InventoryRepository:
    """Repository for handling Inventory database operations.

    Manages document retrieval and many-to-many relationships with tags.
    """

    @staticmethod
    async def get_all(db: AsyncSession, ctx) -> List[models.Inventory]:
        """Fetch all inventory items.

        :param db: Active database session
        :param ctx: Request context for user and team info
        :return: List of inventory items.
        """
        stmt = sql.select(models.Inventory)
        stmt = ctx.team_filter(stmt, models.Inventory)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_detailed_list(db: AsyncSession, ctx) -> List[models.Inventory]:
        """Fetch all inventory items with detailed information.

        Related tables (team, room, machine, category).

        :param db: Active database session
        :param ctx: Request context for user and team info
        :return: List of inventory items.
        """
        stmt = sql.select(models.Inventory).options(
            orm.joinedload(models.Inventory.team),
            orm.joinedload(models.Inventory.room),
            orm.joinedload(models.Inventory.machine),
            orm.joinedload(models.Inventory.category),
            orm.joinedload(models.Inventory.rental_history)
            .joinedload(models.Rentals.user)
            .joinedload(models.User.teams)
            .joinedload(models.UsersTeams.team),
        )

        stmt = ctx.team_filter(stmt, models.Inventory)
        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, item_id: int, ctx, detailed: bool = False
    ) -> models.Inventory:
        """Fetch specific inventory item by ID.

        :param item_id: Item ID
        :param db: Active database session
        :param ctx: Request context for user and team info
        :return: Inventory item.
        """
        stmt = sql.select(models.Inventory).filter(models.Inventory.id == item_id)

        if detailed:
            stmt = stmt.options(
                orm.joinedload(models.Inventory.team),
                orm.joinedload(models.Inventory.room),
                orm.joinedload(models.Inventory.machine),
                orm.joinedload(models.Inventory.category),
                orm.joinedload(models.Inventory.rental_history)
                .joinedload(models.Rentals.user)
                .joinedload(models.User.teams)
                .joinedload(models.UsersTeams.team),
            )

        stmt = ctx.team_filter(stmt, models.Inventory)
        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()
