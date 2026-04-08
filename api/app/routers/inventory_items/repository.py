from typing import List

from sqlalchemy import orm, sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models


class InventoryRepository:
    """Repository for handling Inventory Item database operations.

    Manages document retrieval and many-to-many relationships with tags.
    """

    @staticmethod
    async def get_all(db: AsyncSession, ctx) -> List[models.InventoryItem]:
        """Fetch all physical inventory items.

        :param db: Active database session
        :param ctx: Request context for user and team info
        :return: List of inventory items.
        """
        stmt = sql.select(models.InventoryItem)
        stmt = ctx.team_filter(stmt, models.InventoryItem)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_detailed_list(db: AsyncSession, ctx) -> List[models.InventoryItem]:
        """Fetch all physical inventory items with detailed information.

        Related tables (model, category, team, room, machine).

        :param db: Active database session
        :param ctx: Request context for user and team info
        :return: List of inventory items.
        """
        stmt = sql.select(models.InventoryItem).options(
            orm.joinedload(models.InventoryItem.model).joinedload(models.InventoryModel.category),
            orm.joinedload(models.InventoryItem.team),
            orm.joinedload(models.InventoryItem.room),
            orm.joinedload(models.InventoryItem.machine),
            orm.joinedload(models.InventoryItem.rental_history)
            .joinedload(models.Rentals.user)
            .joinedload(models.User.teams)
            .joinedload(models.UsersTeams.team),
        )

        stmt = ctx.team_filter(stmt, models.InventoryItem)
        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, item_id: int, ctx, detailed: bool = False
    ) -> models.InventoryItem:
        """Fetch specific physical inventory item by ID.

        :param item_id: Item ID
        :param db: Active database session
        :param ctx: Request context for user and team info
        :param detailed: Whether to load related objects
        :return: Inventory item.
        """
        stmt = sql.select(models.InventoryItem).filter(models.InventoryItem.id == item_id)

        if detailed:
            stmt = stmt.options(
                orm.joinedload(models.InventoryItem.model).joinedload(models.InventoryModel.category),
                orm.joinedload(models.InventoryItem.team),
                orm.joinedload(models.InventoryItem.room),
                orm.joinedload(models.InventoryItem.machine),
                orm.joinedload(models.InventoryItem.rental_history)
                .joinedload(models.Rentals.user)
                .joinedload(models.User.teams)
                .joinedload(models.UsersTeams.team),
            )

        stmt = ctx.team_filter(stmt, models.InventoryItem)
        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()