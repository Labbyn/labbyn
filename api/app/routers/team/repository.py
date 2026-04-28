from typing import Any, List, Optional, Sequence

from sqlalchemy import orm, sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models


class TeamRepository:
    """Repository for handling Team database operations and complex relations."""

    @staticmethod
    async def get_all(db: AsyncSession) -> List[models.Teams]:
        """Fetch all teams with basic info.

        :param db: Active database session.
        :return: List of Team objects.
        """
        stmt = sql.select(models.Teams).options(
            orm.joinedload(models.Teams.users).joinedload(models.UsersTeams.user)
        )
        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_users_teams(db: AsyncSession, user_id: int) -> List[models.Teams]:
        """Fetch teams associated with the user.

        :param db: Active database session.
        :return: List of Team objects.
        """
        stmt = (
            sql.select(models.Teams)
            .options(
                orm.joinedload(models.Teams.users).joinedload(models.UsersTeams.user)
            )
            .join(models.UsersTeams)
            .filter(models.UsersTeams.user_id == user_id)
        )

        result = await db.execute(stmt)
        return result.unique().scalars().all()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, team_id: int, detailed: bool = False
    ) -> Optional[models.Teams]:
        """Fetch a specific team by ID.

        :param db: Active database session.
        :param team_id: ID of the team.
        :param detailed: Whether to load all nested relations (users, racks, inventory).
        :return: Team object or None.
        """
        stmt = sql.select(models.Teams).filter(models.Teams.id == team_id)

        if detailed:
            stmt = stmt.options(
                orm.joinedload(models.Teams.users).joinedload(models.UsersTeams.user),
                orm.joinedload(models.Teams.racks).joinedload(models.Rack.tags),
                orm.joinedload(models.Teams.racks)
                .joinedload(models.Rack.shelves)
                .joinedload(models.Shelf.machines)
                .joinedload(models.Machines.tags),
                orm.joinedload(models.Teams.machines).joinedload(models.Machines.tags),
                orm.joinedload(models.Teams.inventory).joinedload(
                    models.Inventory.room
                ),
                orm.joinedload(models.Teams.inventory).joinedload(
                    models.Inventory.category
                ),
                orm.joinedload(models.Teams.inventory).joinedload(
                    models.Inventory.machine
                ),
            )

        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()

    @staticmethod
    async def get_all_detailed(db: AsyncSession) -> Sequence[Any]:
        """Fetch all teams with user relations for team_info lists.

        :param db: Active database session.
        :return: List of Team objects.
        """
        stmt = sql.select(models.Teams).options(
            orm.joinedload(models.Teams.users).joinedload(models.UsersTeams.user)
        )
        result = await db.execute(stmt)
        return result.unique().scalars().all()
