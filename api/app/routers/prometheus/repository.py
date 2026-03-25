from typing import Set, Optional
from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models


class PrometheusRepository:
    """Handles database queries for machine names, team metadata, and authorization."""

    @staticmethod
    async def get_allowed_hosts(db: AsyncSession, ctx) -> Set[str]:
        """Fetch a set of hostnames that the current user is authorized to monitor.

        :param db: Active asynchronous database session.
        :param ctx: The RequestContext object containing user identity and team filters.
        :return: A set of unique hostnames (machine names) as strings.
        """
        query = sql.select(models.Machines.name)
        query = ctx.team_filter(query, models.Machines)
        result = await db.execute(query)
        return {row[0] for row in result.all()}

    @staticmethod
    async def get_team_name(db: AsyncSession, team_id: int) -> Optional[str]:
        """Retrieve the human-readable name of a team based on its unique ID.

        :param db: Active asynchronous database session.
        :param team_id: The unique integer ID of the team.
        :return: The team name as a string, or None if the team does not exist.
        """
        stmt = sql.select(models.Teams.name).where(models.Teams.id == team_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()
