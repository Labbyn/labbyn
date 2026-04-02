from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models


class DashboardRepository:
    """Repository for gathering all data required for the user dashboard.

    This class handles multiple team-filtered queries to provide a
    consolidated view of the system's current state.
    """

    @staticmethod
    async def get_dashboard_data(db: AsyncSession, ctx):
        """Fetch all entities required for the dashboard in a single pass.

        :param db: Active asynchronous database session.
        :param ctx: Request context used for team-based filtering.
        :return: A dictionary containing lists of machines, rooms, inventories, teams, and histories.
        """
        machines_stmt = ctx.team_filter(select(models.Machines), models.Machines)
        rooms_stmt = ctx.team_filter(select(models.Rooms), models.Rooms)
        inventory_stmt = ctx.team_filter(select(models.Inventory), models.Inventory)
        teams_stmt = ctx.team_filter(select(models.Teams), models.Teams)
        history_stmt = ctx.team_filter(select(models.History), models.History)

        return {
            "machines": (await db.execute(machines_stmt)).scalars().all(),
            "rooms": (await db.execute(rooms_stmt)).scalars().all(),
            "inventories": (await db.execute(inventory_stmt)).scalars().all(),
            "teams": (await db.execute(teams_stmt)).scalars().all(),
            "histories": (await db.execute(history_stmt)).scalars().all(),
        }
