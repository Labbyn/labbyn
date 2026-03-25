from typing import List, Optional
from sqlalchemy import sql, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models


class RentalRepository:
    """Repository for handling Rental database operations."""

    @staticmethod
    async def get_all(db: AsyncSession, ctx) -> List[models.Rentals]:
        """Fetch all rentals with team filtering via Inventory join.

        :param db: Active database session.
        :param ctx: Request context for team filtering.
        :return: List of Rental objects.
        """
        stmt = sql.select(models.Rentals).join(
            models.Inventory, models.Rentals.item_id == models.Inventory.id
        )
        stmt = ctx.team_filter(stmt, models.Inventory)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, rental_id: int, ctx
    ) -> Optional[models.Rentals]:
        """Fetch specific rental by ID with team filtering.

        :param db: Active database session.
        :param rental_id: ID of the rental.
        :param ctx: Request context.
        :return: Rental object or None.
        """
        stmt = (
            sql.select(models.Rentals)
            .join(models.Inventory, models.Rentals.item_id == models.Inventory.id)
            .filter(models.Rentals.id == rental_id)
        )
        stmt = ctx.team_filter(stmt, models.Inventory)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_active_rentals_sum(
        db: AsyncSession, item_id: int, start_date, end_date
    ) -> int:
        """Calculate the sum of rented quantities for an item in a specific date range.

        :param db: Active database session.
        :param item_id: ID of the inventory item.
        :param start_date: Start of the period.
        :param end_date: End of the period.
        :return: Total quantity already rented.
        """
        sum_stmt = sql.select(
            func.coalesce(func.sum(models.Rentals.quantity), 0)
        ).filter(
            models.Rentals.item_id == item_id,
            models.Rentals.start_date <= end_date,
            models.Rentals.end_date >= start_date,
        )
        result = await db.execute(sum_stmt)
        return result.scalar()
