from typing import List

from sqlalchemy import orm, sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models


class InventoryModelRepository:
    """Repository for handling Inventory Models database operations."""

    @staticmethod
    async def get_all(db: AsyncSession) -> List[models.InventoryModel]:
        """Fetch all inventory models with their categories."""
        stmt = sql.select(models.InventoryModel).options(
            orm.joinedload(models.InventoryModel.category)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, model_id: int
    ) -> models.InventoryModel:
        """Fetch specific inventory model by ID."""
        stmt = (
            sql.select(models.InventoryModel)
            .filter(models.InventoryModel.id == model_id)
            .options(orm.joinedload(models.InventoryModel.category))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()