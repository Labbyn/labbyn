from typing import Any, List, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import models


class DocumentationRepository:
    """Repository for handling Documentation database operations.

    Manages document retrieval and many-to-many relationships with tags.
    """

    @staticmethod
    async def get_all(db: AsyncSession) -> Sequence[Any]:
        """Fetch all documents with their associated tags.

        :param db: Active asynchronous database session.
        :return: List of all documentation model instances.
        """
        stmt = select(models.Documentation).options(
            joinedload(models.Documentation.tags)
        )
        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, documentation_id: int
    ) -> models.Documentation:
        """Fetch a specific document by its unique ID.

        :param db: Active asynchronous database session.
        :param documentation_id: Primary key ID of the document.
        :return: Documentation model instance or None if not found.
        """
        stmt = (
            select(models.Documentation)
            .where(models.Documentation.id == documentation_id)
            .options(joinedload(models.Documentation.tags))
        )
        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()

    @staticmethod
    async def get_tags_by_ids(
        db: AsyncSession, tag_ids: List[int]
    ) -> List[models.Tags]:
        """Retrieve tag objects based on a list of IDs.

        :param db: Active asynchronous database session.
        :param tag_ids: List of tag IDs to retrieve.
        :return: List of Tag model instances.
        """
        tag_stmt = select(models.Tags).where(models.Tags.id.in_(tag_ids))
        tag_result = await db.execute(tag_stmt)
        return list(tag_result.scalars().all())
