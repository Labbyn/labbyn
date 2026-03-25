from typing import Optional, Any, Sequence
from sqlalchemy import sql, orm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models


class MetadataRepository:
    """Repository for handling Metadata database operations."""

    @staticmethod
    async def get_all(db: AsyncSession, ctx) -> Sequence[Any]:
        """Fetch all metadata records with team filtering via Machines join.

        :param db: Active asynchronous database session.
        :param ctx: Request context with team filtering logic.
        :return: List of Metadata model instances.
        """
        stmt = sql.select(models.Metadata).join(models.Machines)
        result = await db.execute(ctx.team_filter(stmt, models.Machines))
        return result.scalars().all()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, meta_id: int, ctx, with_machines: bool = False
    ) -> Optional[models.Metadata]:
        """Fetch specific metadata by ID with team filtering.

        :param db: Active asynchronous database session.
        :param meta_id: Primary key of the metadata record.
        :param ctx: Request context for user and team info.
        :param with_machines: Whether to eagerly load associated machines.
        :return: Metadata model instance or None.
        """
        stmt = (
            sql.select(models.Metadata)
            .filter(models.Metadata.id == meta_id)
            .join(models.Machines)
        )
        if with_machines:
            stmt = stmt.options(orm.selectinload(models.Metadata.machines))

        result = await db.execute(ctx.team_filter(stmt, models.Machines))
        return result.scalar_one_or_none()
