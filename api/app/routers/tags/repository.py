from typing import Any, List, Optional, Sequence

from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models


class TagRepository:
    """Repository for handling Tag database operations and entity lookups."""

    @staticmethod
    async def get_all(db: AsyncSession) -> List[models.Tags]:
        """Fetch all available tags.

        :param db: Active database session.
        :return: List of Tag objects.
        """
        stmt = sql.select(models.Tags)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, tag_id: int) -> Optional[models.Tags]:
        """Fetch a specific tag by its ID.

        :param db: Active database session.
        :param tag_id: ID of the tag.
        :return: Tag object or None.
        """
        stmt = sql.select(models.Tags).filter(models.Tags.id == tag_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_tags_by_ids(db: AsyncSession, tag_ids: List[int]) -> Sequence[Any]:
        """Fetch multiple tags by a list of IDs.

        :param db: Active database session.
        :param tag_ids: List of tag IDs.
        :return: List of found Tag objects.
        """
        stmt = sql.select(models.Tags).where(models.Tags.id.in_(tag_ids))
        result = await db.execute(stmt)
        return result.scalars().all()
