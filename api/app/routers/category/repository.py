from typing import List
from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models


class CategoryRepository:
    """Repository for handling Category database operations.

    Provides methods for CRUD operations on Categories model.
    """

    @staticmethod
    async def get_all(db: AsyncSession) -> List[models.Categories]:
        """Fetch all categories from the database.

        :param db: Active asynchronous database session.
        :return: List of all Category model instances.
        """
        result = await db.execute(sql.select(models.Categories))
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, cat_id: int) -> models.Categories:
        """Fetch a specific category by its unique ID.

        :param db: Active asynchronous database session.
        :param cat_id: The primary key ID of the category.
        :return: Category model instance or None if not found.
        """
        result = await db.execute(
            sql.select(models.Categories).where(models.Categories.id == cat_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_name(db: AsyncSession, name: str) -> models.Categories:
        """Fetch a specific category by its name.

        :param db: Active asynchronous database session.
        :param name: The unique name of the category.
        :return: Category model instance or None if not found.
        """
        result = await db.execute(
            sql.select(models.Categories).where(models.Categories.name == name)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def delete(db: AsyncSession, category: models.Categories):
        """Delete a category instance from the database.

        :param db: Active asynchronous database session.
        :param category: The Category model instance to be deleted.
        """
        await db.delete(category)
