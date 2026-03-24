from typing import Optional, Type, Any, Sequence
from sqlalchemy import sql, orm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models


class HistoryRepository:
    """Repository for handling History log operations and entity resolution.

    Provides methods to fetch logs and map entity types to SQLAlchemy models.
    """

    @staticmethod
    def get_model_class(entity_type: models.EntityType) -> Optional[Type]:
        """Map EntityType enum to corresponding SQLAlchemy model class.

        :param entity_type: The type of entity from the log.
        :return: SQLAlchemy model class or None if not mapped.
        """
        mapping = {
            models.EntityType.MACHINES: models.Machines,
            models.EntityType.INVENTORY: models.Inventory,
            models.EntityType.ROOM: models.Rooms,
            models.EntityType.USER: models.User,
            models.EntityType.CATEGORIES: models.Categories,
        }
        return mapping.get(entity_type)

    @staticmethod
    async def get_all_logs(db: AsyncSession, ctx, limit: int) -> Sequence[Any]:
        """Fetch history logs with user information and team filtering.

        :param db: Active database session.
        :param ctx: Request context for team filtering.
        :param limit: Max number of logs to return.
        :return: List of History model instances.
        """
        stmt = (
            sql.select(models.History)
            .join(models.User, models.History.user_id == models.User.id)
            .options(orm.joinedload(models.History.user))
        )
        stmt = ctx.team_filter(stmt, models.User)
        stmt = stmt.order_by(models.History.timestamp.desc()).limit(limit)

        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, history_id: int, ctx) -> models.History:
        """Fetch a single history log by ID with access check.

        :param db: Active database session.
        :param history_id: ID of the log entry.
        :param ctx: Request context for team filtering.
        :return: History model instance or None.
        """
        stmt = (
            sql.select(models.History)
            .join(models.User, models.History.user_id == models.User.id)
            .options(orm.joinedload(models.History.user))
            .filter(models.History.id == history_id)
        )
        stmt = ctx.team_filter(stmt, models.User)
        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()