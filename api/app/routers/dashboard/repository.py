from sqlalchemy import select, orm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models


class DashboardRepository:
    """Repository for gathering all data required for the user dashboard."""

    @staticmethod
    async def get_dashboard_data(db: AsyncSession, ctx):
        """Fetch all entities required for the dashboard."""

        machines_stmt = ctx.team_filter(
            select(models.Machines).options(orm.joinedload(models.Machines.team)),
            models.Machines,
        )

        rooms_stmt = ctx.team_filter(
            select(models.Rooms).options(orm.joinedload(models.Rooms.team)),
            models.Rooms,
        )

        inventory_stmt = ctx.team_filter(
            select(models.Inventory).options(orm.joinedload(models.Inventory.category)),
            models.Inventory,
        )

        teams_stmt = ctx.team_filter(
            select(models.Teams),
            models.Teams,
        )

        users_stmt = select(models.User)

        history_stmt = (
            ctx.team_filter(
                select(models.History).options(orm.joinedload(models.History.user)),
                models.History,
            )
            .order_by(models.History.timestamp.desc())
            .limit(10)
        )

        return {
            "machines": (await db.execute(machines_stmt)).scalars().all(),
            "rooms": (await db.execute(rooms_stmt)).scalars().all(),
            "inventories": (await db.execute(inventory_stmt)).scalars().all(),
            "teams": (await db.execute(teams_stmt)).scalars().all(),
            "histories": (await db.execute(history_stmt)).scalars().all(),
            "users": (await db.execute(users_stmt)).scalars().all(),
        }
