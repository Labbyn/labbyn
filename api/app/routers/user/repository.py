from typing import List, Optional

from sqlalchemy import orm, sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models


class UserRepository:
    """Repository for handling User database operations and complex relations."""

    @staticmethod
    async def get_by_id(
        db: AsyncSession, user_id: int, detailed: bool = False
    ) -> Optional[models.User]:
        """Fetch a specific user by ID.

        :param db: Active database session.
        :param user_id: ID of the user.
        :param detailed: Whether to join team memberships.
        :return: User object or None.
        """
        stmt = sql.select(models.User).where(models.User.id == user_id)
        if detailed:
            stmt = stmt.options(
                orm.joinedload(models.User.teams).joinedload(models.UsersTeams.team)
            )
        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()

    @staticmethod
    async def get_all_with_teams(db: AsyncSession) -> List[models.User]:
        """Fetch all users with their team relations.

        :param db: Active database session.
        :return: List of User objects.
        """
        stmt = sql.select(models.User).options(
            orm.joinedload(models.User.teams).joinedload(models.UsersTeams.team)
        )
        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_membership(
        db: AsyncSession, user_id: int, team_id: int
    ) -> Optional[models.UsersTeams]:
        """Fetch a specific team membership record.

        :param db: Active database session.
        :param user_id: ID of the user.
        :param team_id: ID of the team.
        :return: User object or None.
        """
        stmt = sql.select(models.UsersTeams).where(
            models.UsersTeams.user_id == user_id, models.UsersTeams.team_id == team_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
